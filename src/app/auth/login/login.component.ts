import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar'; // Importar MatSnackBar
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar // Inyectar MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.loginForm || this.loginForm.invalid) {
      return;
    }

    const email = this.loginForm.get('email')?.value;
    const password = this.loginForm.get('password')?.value;

    try {
      await this.authService.loginWithEmail(email, password);

      // Obtener el rol del usuario después de iniciar sesión
      const isAdmin = await this.authService.isAdmin();
      const isSeller = await this.authService.isSeller();

      // Redirigir al componente correspondiente según el rol del usuario
      if (isAdmin) {
        this.router.navigate(['/dashboard']); // Redirigir al dashboard si es administrador
      } else if (isSeller) {
        this.router.navigate(['/venta']); // Redirigir a ventas si es vendedor
      } else {
        // Manejar el caso en el que el usuario no tenga ningún rol asignado
        this.snackBar.open('Usuario no tiene un rol válido asignado. Contacte al administrador.', 'Cerrar', {
          duration: 5000, // Duración del snackbar en milisegundos (opcional)
          panelClass: ['snackbar-error'] // Clase de estilo CSS para el snackbar (opcional)
        });
      }
    } catch (error) {
      // Mostrar mensaje de error al iniciar sesión
      this.snackBar.open('Error al iniciar sesión. Verifique sus credenciales e intente nuevamente.', 'Cerrar', {
        duration: 5000, // Duración del snackbar en milisegundos (opcional)
        panelClass: ['snackbar-error'] // Clase de estilo CSS para el snackbar (opcional)
      });
    }
  }
}
