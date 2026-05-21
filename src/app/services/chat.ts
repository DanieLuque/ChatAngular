import { inject, Injectable } from '@angular/core';
import { MensajeChat } from '../../models/chat';
import { AuthService } from './auth';
import { FirebaseService } from './firebase';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { GeminiService } from './gemini';



@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);
  private geminiService = inject(GeminiService)

  //mantener la lista de mensajes actualizada mostrandio el ultimo mensaje
  private mensajeSubject = new BehaviorSubject<MensajeChat[]>([]);

  //el signo peso = $$$ es un observable
  public mensajes$ = this.mensajeSubject.asObservable();
  private cargandoHistorial = false;

  // variable para controlar si el asistente esta escribiendo
  private asistenteRespondiendo = new BehaviorSubject<boolean>(false);
  public asistenteRespondiendo$ = this.asistenteRespondiendo.asObservable();


  async inicializandoChat(usuarioId: string): Promise<void> {
    if (this.cargandoHistorial) {
      return;
    }
    this.cargandoHistorial = true;


    try {
      this.firebaseService.obtenerMensajesUsuario(usuarioId).subscribe({
        next: (mensajes) => {
          this.mensajeSubject.next(mensajes);
          this.cargandoHistorial = false;
        },
        error: (error) => {
          this.cargandoHistorial = false;
          console.error('Error al cargar el historial', error)

          this.mensajeSubject.next([]);
        }
      })
    } catch (error) {
      console.error('Error al inicializar', error)
      this.cargandoHistorial = false;
      this.mensajeSubject.next([]);
    }
  }
  async enviarMensaje(contenidoMensaje: string): Promise<void> {
    //revisar el usuario actual o
    const usuarioActual = this.authService.obtenerUsuarioAactual();
    if (!usuarioActual) {
      console.error('no hay usuario autenticado');
      throw new Error('no hay usuario autenticado');
    }
    //si el mensaje viene vacio
    if (!contenidoMensaje.trim()) {
      return;
    }
    const mensajeUsuario: MensajeChat = {
      usuario: usuarioActual.uid,
      contenido: contenidoMensaje,
      fechaEnvio: new Date(),
      tipo: 'usuario',
      estado: 'enviado'
    }
    try {
      const mensajeDelUsuaio = this.mensajeSubject.value;
      const nuevoMensajeEncontrados = [...mensajeDelUsuaio, mensajeUsuario];
      this.mensajeSubject.next(nuevoMensajeEncontrados);



      try {
        await this.firebaseService.guardarMensaje(mensajeUsuario)
      } catch (firestoreError) {
        console.error('Error al guardar el mensaje');
      }

      //para mostrar que el asistente esta procesando la solicitud
      this.asistenteRespondiendo.next(true);

      //tener los mensajes actuales
      const mensajesActuales = this.mensajeSubject.value;
      //se debe hacer el proceso de converison de los mensajes a el formato de gemini


      //ayudar a reducir los tokens de gemini
      const historialParaGemini = this.geminiService.convertirHistorialGemini(
        mensajesActuales.slice(-6)
      );

      const respuestaAsistente = await firstValueFrom(
        this.geminiService.enviarMensaje(contenidoMensaje, historialParaGemini)
      );


      //mensaje del asistente lo unico que cambio el contenido y el tipo
      const mensajeAsistente: MensajeChat = {
        usuario: usuarioActual.uid,
        contenido: respuestaAsistente,
        fechaEnvio: new Date(),
        estado: 'enviando',       
        tipo: 'asistente',
        
      };
      const mensajesActualesAsistente = this.mensajeSubject.value;

      const nuevoMensajeEncontradosAsistente = [...mensajesActualesAsistente, mensajeAsistente];
      this.mensajeSubject.next(nuevoMensajeEncontradosAsistente);

      try{
        await this.firebaseService.guardarMensaje(mensajeAsistente)
      }catch(firestoreError){

      }
    } catch (error) {
      console.error('error procesando el mensaje',error)
    }finally{
      this.asistenteRespondiendo.next(false);
    }

  }
   //obtener mensajes
    obtenerMensaje(): MensajeChat[]{
      return this.mensajeSubject.value;
      
      
    }

    //limpiar chat
    limpiarChat(): void{
      this.mensajeSubject.next([]);
    }


    









}