import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Cliente } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';
import { VentaService } from '../../services/venta.service';
import { Venta } from '../../models/venta.model';
import { ProductoService } from '../../services/producto.service';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  userName: string = '';
  isLoggedIn: boolean = false;
  isAdmin: boolean = false;
  isSeller: boolean = false;
  sidebarClosed: boolean = true;
  showChartsContent: boolean = true;
  primerosClientes: Cliente[] = [];
  totalVentasMes: number = 0;
  productosBajoStock!: Producto[];
  constructor(
    private authService: AuthService,private clienteService:
     ClienteService,
     private ventaService: VentaService,
     private productoService: ProductoService
     ) {}

  ngOnInit(): void {
    this.authService.getUserName().subscribe(name => this.userName = name);
    this.authService.isLoggedIn().subscribe(loggedIn => this.isLoggedIn = loggedIn);
    this.authService.isAdmin().subscribe(admin => this.isAdmin = admin);
    this.authService.isSeller().subscribe(seller => this.isSeller = seller);
    this.clienteService.getClientes().subscribe(clientes => {
      // Seleccionar los primeros 5 clientes
      this.primerosClientes = clientes.slice(0, 5);
    }); this.calcularTotalVentasMes();
    this.productoService.getProductosBajoStock().subscribe(productos => {
      this.productosBajoStock = productos;
    });
  
  }

  logout(): void {
    this.authService.logout();
  }

  toggleSidebar(): void {
    this.sidebarClosed = !this.sidebarClosed;
  }
  // Método para cambiar la visibilidad del contenido de los gráficos
  toggleChartsContent(): void {
    this.showChartsContent = !this.showChartsContent;
  } calcularTotalVentasMes(): void {
    // Obtener las ventas del mes actual
    this.ventaService.generarReporteVentasUltimoMes().subscribe(ventas => {
      // Calcular la suma de los valores de venta
      this.totalVentasMes = ventas.reduce((total, venta) => total + venta.total_venta, 0);
    });
  }
}
