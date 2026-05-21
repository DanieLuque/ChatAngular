import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase';


@Component({
  selector: 'app-auth',
  imports: [],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {

  //inyeccion de dependencias
  private authService = inject(AuthService)
  private router = inject(Router)

  autenticando = false;
  mensajeError = ""

  async iniciarSesionConGoogle(): Promise<void> {
    this.autenticando = true;
    this.mensajeError = "";

    try {
      const usuario = await this.authService.iniciarSesionConGoogle();

      // let usuario = null
      //usuario = await new Promise((resolve) => {
      //  setTimeout(() => resolve({ nombre: 'usuario registrado' }), 300)
      //})


      if (usuario) {
        //si el usuario trae datos se envia al chat
        await this.router.navigate(['/chat'])
      } else {
        this.mensajeError = "no se pudo verificar la informacion del usuario"
        console.log("Error en la verificacion de autenticacion del usuario");
      }

    } catch (error: any) {
      console.error("Error en la autenticacion");
      //validacion de posibles errrores
      if (error.code == "auth/popup-closed-by-user") {
        this.mensajeError = "Cerraste la ventana de autenticacion"
        console.error("Cerraste la ventana de autenticacion")
      } else if (error.code == "auth/popup-blocked") {
        this.mensajeError = "Cerraste la ventana de autenticacion"
        console.error("El navegador bloqueo la ventana emergente")
      } else if (error.code == "auth/network-request-failed") {
        this.mensajeError = "error de conexion"
        console.error("Error de conexion ")
      }
    } finally {
      this.autenticando = false
    }
    // funcion para si al autenticacion no esta generada

    
  }
  ngOnInit(): void {
      this.authService.estaAuntenticado$.subscribe(auntenticado => {
        if (auntenticado) {
          this.router.navigate(['/chat']);
        }
      })
    }
}
