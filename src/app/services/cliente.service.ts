import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentChangeAction } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { Cliente } from '../models/cliente.model';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private clientesCollection: AngularFirestoreCollection<Cliente>;
  clientes: Observable<Cliente[]>;

  constructor(private firestore: AngularFirestore) {
    this.clientesCollection = this.firestore.collection<Cliente>('clientes');
    this.clientes = this.clientesCollection.snapshotChanges().pipe(
      map(actions => {
        return actions.map(action => {
          const data = action.payload.doc.data() as Cliente;
          const id = action.payload.doc.id;
          return { id, ...data } as Cliente;
        });
      })
    );
  }

  // Método para obtener todos los clientes
  getClientes(): Observable<Cliente[]> {
    return this.clientes;
  }
  agregarCliente(cliente: Cliente): Promise<any> {
    return this.firestore.collection<Cliente>('clientes').snapshotChanges().pipe(
      take(1),
      switchMap((clientes: DocumentChangeAction<Cliente>[]) => {
        // Obtener el último ID generado
        const lastId = clientes.length > 0 ? +clientes[clientes.length - 1].payload.doc.id : 0;
        // Generar el nuevo ID sumando 1 al último ID
        const newId = lastId + 1;
        // Asignar el nuevo ID al cliente que se va a agregar
        cliente.id_cliente = newId;
        // Agregar el cliente a la colección
        return this.clientesCollection.add(cliente);
      })
    ).toPromise();
  }
  
  // Método para obtener un cliente por su ID
  getClienteById(id: string): Observable<Cliente | undefined> {
    return this.clientesCollection.doc<Cliente>(id).valueChanges().pipe(
      map(cliente => cliente ? { ...cliente, id } as Cliente : undefined)
    );
  }

  // Método para actualizar un cliente
  actualizarCliente(id: string, data: any): Promise<void> {
    return this.clientesCollection.doc(id).update(data);
  }

  // Método para eliminar un cliente
  eliminarCliente(id: string): Promise<void> {
    return this.clientesCollection.doc(id).delete();
  }

  // Método para buscar clientes por nombre
  buscarClientePorNombre(nombre: string): Observable<Cliente[]> {
    return this.firestore.collection<Cliente>('clientes', ref => ref.where('nombre_cliente', '==', nombre))
      .valueChanges({ idField: 'id' });
  }

  // Método para buscar clientes por apellido
  buscarClientePorApellido(apellido: string): Observable<Cliente[]> {
    return this.firestore.collection<Cliente>('clientes', ref => ref.where('apellido_cliente', '==', apellido))
      .valueChanges({ idField: 'id' });
  }

  // Método para filtrar clientes por algún criterio
  // Por ejemplo, podrías filtrar por nombre, apellido, número de carnet, etc.
  filtrarClientes(filtro: any): Observable<Cliente[]> {
    return this.firestore.collection<Cliente>('clientes', ref => {
      let query: firebase.default.firestore.CollectionReference | firebase.default.firestore.Query = ref;
      // Aquí puedes aplicar los filtros necesarios según el criterio que desees
      if (filtro.nombre) {
        query = query.where('nombre_cliente', '==', filtro.nombre);
      }
      if (filtro.apellido) {
        query = query.where('apellido_cliente', '==', filtro.apellido);
      }
      // Agrega más condiciones según tus necesidades

      return query;
    }).valueChanges({ idField: 'id' });
  }
}
