import { Injectable, inject } from '@angular/core'
import { FirebaseApp } from '@angular/fire/app';
import { Auth, user, User } from '@angular/fire/auth';
import { Usuario } from '../../models/usuario';
import { map } from 'rxjs/operators';
import { GoogleAuthProvider , signInWithPopup, signOut} from 'firebase/auth';


@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private auth = inject(Auth)
  usuario$ = user(this.auth)

  estaAuntenticado$ = this.usuario$.pipe(
    map(usuario => !!usuario)
  )
  // inicio de sesion con google Asincrona
  async iniciarSesionConGoogle(): Promise<Usuario | null> {
    try {
      const proveedor = new GoogleAuthProvider()
      

      proveedor.addScope('email')
      proveedor.addScope('profile')

      console.log('Iniciando autenticacion con Google...');

      const resultado = await signInWithPopup(this.auth, proveedor)
      //ventana
       // Log para depuración
      const usuarioFirebase = resultado.user;
      console.log('Usuario autenticado:', usuarioFirebase); // Log para depuración
      if(usuarioFirebase) {
        const usuario: Usuario = {
          uid: usuarioFirebase.uid,
          email: usuarioFirebase.email || '',
          nombre: usuarioFirebase.displayName || 'Usuario sin nombre',
          fotoUrl: usuarioFirebase.photoURL || undefined,
          fechaCreacion: new Date(),
          ultimaConexion: new Date()
        }
        return usuario;
      }
      return null;
    } catch (error) {
      console.error('✖️ Error durante la autenticacion', error);
      throw error;
    }
  }
  // obtener el ususario Actual Autenticado

  obtenerUsuarioAactual(): User | null {
    return this.auth.currentUser;
  }
  // cerrar la sesion funcion asincrona
  async cerrarSesion(): Promise<void> {
    try {
      await signOut(this.auth);
    }catch (error) {
      console.error('✖️ Error cerrando la sesion');
      throw error;
    }
  }
//autentificacion
  // obtener id usuario Auutenticada
  obtenerIdUsuario(): string | null {
    const usuario = this.obtenerUsuarioAactual();
    return usuario ? usuario.uid : null;

  }
}