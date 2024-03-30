import { AfterViewInit, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Producto } from '../../models/producto.model';
import { Cliente } from '../../models/cliente.model';
import { ProductoService } from '../../services/producto.service';
import { ClienteService } from '../../services/cliente.service';
import { CarritoService } from '../../services/carrito.service';
import { AuthService } from '../../services/auth.service';
import { CarritoItem } from '../../models/carrito.model';
import { Venta } from '../../models/venta.model';
import { VentaService } from '../../services/venta.service';
import { DetalleVentaService } from '../../services/detalle-venta.service';
import { PagoCredito } from '../../models/pago-credito.model';
import { PagoCreditoService } from '../../services/pago-credito.service';
import { DetalleCreditoService } from '../../services/detalle-credito.service';

// Declaramos jQuery de manera global
declare var $: any;

@Component({
  selector: 'app-venta',
  templateUrl: './venta.component.html',
  styleUrls: ['./venta.component.css']
})
export class VentaComponent implements  AfterViewInit {
  productos: Producto[] = [];
  clientes: Cliente[] = [];
  ventaForm: FormGroup;
  subtotal: number = 0;
  total: number = 0;
  tipoPago: string = 'contado';
  carrito: CarritoItem[] = [];
  currentUser: any; // Usuario actual

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService,
    private clienteService: ClienteService,
    private carritoService: CarritoService,
    private authService: AuthService,
    private ventaService: VentaService,
    private detalleVentaService: DetalleVentaService,
    private pagoCreditoService: PagoCreditoService,
    private detalleCreditoService: DetalleCreditoService,
  ) {
    this.ventaForm = this.fb.group({
      cliente: ['', Validators.required],
      producto: ['', Validators.required],
      cantidad: [1, Validators.min(1)],
      tipoPago: ['contado'],
      montoInicial: ['', Validators.required],
      numeroCuotas: ['', Validators.required],
      interes: ['', Validators.required]
    });
   
  }

  ngAfterViewInit(): void {
    this.productoService.getProductos().subscribe(productos => {
      this.productos = productos;
      this.initProductoAutocomplete();
    });
    
    this.authService.usuarioActual$.subscribe(user => {
      this.currentUser = user;
    });

    this.clienteService.getClientes().subscribe(clientes => {
      this.clientes = clientes;
      this.initClienteAutocomplete();
    });

    this.carritoService.getProductosEnCarrito().subscribe(carrito => {
      this.carrito = carrito;
      this.calcularSubtotal();
    });
  }

  private initProductoAutocomplete(): void {
    $('#busquedaProducto').autocomplete({
      source: this.productos.map(producto => producto.nombre_producto),
      select: (event: { preventDefault: () => void; }, ui: { item: { value: any; }; }) => {
        this.ventaForm.controls['producto'].setValue(ui.item.value);
        event.preventDefault();
      }
    });
  }

  private initClienteAutocomplete(): void {
    $('#busquedaCliente').autocomplete({
      source: this.clientes.map(cliente => cliente.nombre_cliente),
      select: (event: { preventDefault: () => void; }, ui: { item: { value: any; }; }) => {
        this.ventaForm.controls['cliente'].setValue(ui.item.value);
        event.preventDefault();
      }
    });
  }

  agregarAlCarrito(): void {
    const productoSeleccionadoNombre = this.ventaForm.controls['producto'].value;
    const cantidad = this.ventaForm.controls['cantidad'].value;

    if (!productoSeleccionadoNombre) {
      alert('Seleccione un producto válido.');
      return;
    }

    const productoSeleccionado = this.productos.find(producto => producto.nombre_producto === productoSeleccionadoNombre);

    if (!productoSeleccionado) {
      alert('Seleccione un producto válido.');
      return;
    }

    if (this.carrito.some(item => item.producto.id_producto === productoSeleccionado.id_producto)) {
      const cantidadEnCarrito = this.carrito.find(item => item.producto.id_producto === productoSeleccionado.id_producto)!.cantidad;
      if (cantidadEnCarrito + cantidad > productoSeleccionado.stock) {
        alert('No hay suficientes productos en el stock.');
        return;
      }
    }

    if (cantidad > productoSeleccionado.stock) {
      alert('No hay suficiente stock disponible.');
      return;
    }

    this.carritoService.agregarAlCarrito(productoSeleccionado, cantidad); 
    this.calcularSubtotal();
    this.ventaForm.controls['producto'].reset();
    this.ventaForm.controls['cantidad'].setValue(1);
  }
  
  eliminarDelCarrito(producto: Producto): void {
    this.carritoService.eliminarDelCarrito(producto);
    this.calcularSubtotal();
  }

  vaciarCarrito(): void {
    this.carritoService.limpiarCarrito();
    this.calcularSubtotal();
  }

  calcularSubtotal(): void {
    this.subtotal = this.carrito.reduce((total, item) => total + (item.producto.precio_producto * item.cantidad), 0);
    this.calcularTotal();
  }
  
  calcularTotal(): void {
    this.total = this.tipoPago === 'contado' ? this.subtotal : this.subtotal * 1.1;
  }

  clienteSeleccionado: Cliente | null = null;

  mostrarClienteSeleccionado(): void {
    const clienteNombre = this.ventaForm.controls['cliente'].value;
    this.clienteSeleccionado = this.clientes.find(cliente => cliente.nombre_cliente === clienteNombre) || null;

    if (!this.clienteSeleccionado) {
      alert('Seleccione un cliente válido.');
    }
  }

  async procesarVenta(): Promise<void> {
    try {
      const clienteSeleccionadoNombre = this.ventaForm.controls['cliente'].value;
      const clienteSeleccionado = this.clientes.find(cliente => cliente.nombre_cliente === clienteSeleccionadoNombre);
  
      if (!clienteSeleccionado) {
        alert('Seleccione un cliente válido.');
        return;
      }
  
      if (!this.currentUser) {
        console.error('No se ha iniciado sesión');
        return;
      }
  
      if (!this.ventaForm || !this.ventaForm.controls['montoInicial'] ||
        !this.ventaForm.controls['numeroCuotas'] ||
        !this.ventaForm.controls['interes']) {
        console.error('El formulario ventaCredito no se ha inicializado correctamente.');
        return;
      }
  
      const tipoPagoForm = this.ventaForm.controls['tipoPago'].value;
  
      const venta: Venta = {
        id_venta: 0,
        id_descuento: 0,
        id_cliente: clienteSeleccionado.id_cliente,
        id_usuario: this.currentUser.id_usuario,
        fecha_venta: new Date(),
        tipo_pago: tipoPagoForm, // Utilizar el tipo de pago capturado del formulario
        total_venta: this.subtotal,
      };
  
      // Guardar la venta y obtener el ID generado
      const ventaGuardada = await this.ventaService.agregarVenta(venta);
      const idVenta = ventaGuardada.id;
  
      for (const item of this.carrito) {

        const detalleVenta = {
          id_detalle_venta: 0,
          id_venta: idVenta,
          id_producto: item.producto.id_producto,
          cantidad: item.cantidad,
          subtotal: item.producto.precio_producto * item.cantidad
        };
        await this.productoService.actualizarStock(item.producto.id_producto, item.cantidad);

        await this.detalleVentaService.agregarDetalleVenta(detalleVenta);
      }
  
      if (tipoPagoForm === 'credito') {
        const montoInicial = parseFloat(this.ventaForm.controls['montoInicial'].value) || 0;
        const numeroCuotas = parseInt(this.ventaForm.controls['numeroCuotas'].value) || 0;
        const interes = parseFloat(this.ventaForm.controls['interes'].value) || 0;
  
        const saldo_pendiente = this.total - montoInicial;
        const montoCuota = saldo_pendiente / numeroCuotas;
  
        if (montoInicial < 0 || montoInicial > this.total) {
          alert('El monto inicial no puede ser mayor al total de la venta.');
          return;
        }
  
        if (numeroCuotas < 1) {
          alert('El número de cuotas debe ser mayor o igual a 1.');
          return;
        }
  
        if (interes < 0) {
          alert('El interés no puede ser negativo.');
          return;
        }
  
        const pagoCredito: PagoCredito = {
          id_pago_credito: 0,
          fecha_pago: new Date(),
          monto_pagado: montoInicial,
          saldo_pendiente: saldo_pendiente,
          monto_cuota: montoCuota
        };
  
        const pagoCreditoGuardado = await this.pagoCreditoService.agregarPagoCredito(pagoCredito);
  
        const detalleCredito = {
          id_detalle_credito: 0,
          id_venta: idVenta,
          id_pago_credito: pagoCreditoGuardado.id
        };
  
        await this.detalleCreditoService.agregarDetalleCredito(detalleCredito);
      }
  
      // Limpiar formulario de venta al crédito
      if (tipoPagoForm === 'credito') {
        this.ventaForm.controls['montoInicial'].reset();
        this.ventaForm.controls['numeroCuotas'].reset();
        this.ventaForm.controls['interes'].reset();
      }
  
      // Ocultar el carrito
      this.mostrarCarrito = false;
  
      // Vaciar el carrito
      this.vaciarCarrito();
  
      alert('Venta realizada exitosamente.');
    } catch (error) {
      console.error('Error al procesar la venta:', error);
      alert('Ocurrió un error al procesar la venta. Por favor, intenta nuevamente.');
    }
  }
  
  mostrarFormularioCredito(): boolean {
    return this.ventaForm.get('tipoPago')?.value === 'credito';
  }
  
  mostrarCarrito: boolean = false;
  
  alternarVisibilidadCarrito(): void {
    this.mostrarCarrito = !this.mostrarCarrito;
  }
}

