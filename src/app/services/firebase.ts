import { Injectable, inject } from '@angular/core';
import { collection, Firestore, addDoc, Timestamp, query, where, onSnapshot, DocumentData, QuerySnapshot } from '@angular/fire/firestore';
import { MensajeChat, conversacionChat } from '../../models/chat';
import { Observable } from 'rxjs';



@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private firestore = inject(Firestore)

  //llevar y guardar el mensaje en la coleccion
  async guardarMensaje(mensaje: MensajeChat): Promise<void> {
    try {
      if (!mensaje.usuario) {
        throw new Error("usuario es requerido");
      }
      if (!mensaje.contenido) {
        throw new Error("El contenido es requerido");
      }
      if (!mensaje.tipo) {
        throw new Error("El tipo es requerido");
      }


      //constante con el nombre de la coleccion de firestore
      const coleccionMensaje = collection(this.firestore, 'mensajes');

      //preparanmos el mensaje con la conversionn de fecha(date) a timesramp
      const mensajeParaGuardar = {
        usuario: mensaje.usuario,
        contenido: mensaje.contenido,
        tipo: mensaje.tipo,
        estado: mensaje.estado || 'enviado',
        fechaEnvio: Timestamp.fromDate(mensaje.fechaEnvio)
      }
      // enviar el documenta a la coleccion
      const docRef = await addDoc(coleccionMensaje, mensajeParaGuardar);

    } catch (error: any) {
      console.error('✖️ Error al guardar el mensaje en firestore');
      console.error('✖️ Detalles: ', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }


  // filatrar mensajes de un usuario
  obtenerMensajesUsuario(usuarioid: string): Observable<MensajeChat[]> {
    return new Observable(observer => {
      const consulta = query(
        collection(this.firestore, 'mensajes'),
        where('usuario', '==', usuarioid)
      );

      const unsuscribe = onSnapshot(
        consulta,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const mensaje: MensajeChat[] = snapshot.docs.map(doc => {
            const dat = doc.data();

            return {
              id: doc.id,
              usuario: dat['usuario'],
              contenido: dat['contenido'],
              tipo: dat['tipo'],
              estado: dat['estado'],
              fechaEnvio: dat['fechaEnvio'].toDate()
            } as MensajeChat;
          });

          mensaje.sort((a, b) => a.fechaEnvio.getTime() - b.fechaEnvio.getTime())


          observer.next(mensaje);
        },
        error => {
          console.error('✖️ Error al escuchar los mensajes', error);
          observer.error(error);
        }
      );
      //llmar o invocar una funcion de limpieza que se ejecuta cuando se cansela la suscripcion.
      return () =>{
        unsuscribe();
      }
    })
  }
  async guadarConversacion(conversacion: conversacionChat): Promise<void> {
    try {
      const coleccionConversaciones = collection(this.firestore, 'conversaciones')
      // prepara la conversacio haciendo las conversiones necesarias
      const converacionParaGuardar = {
        ...conversacion,
        fechaCreacion: Timestamp.fromDate(conversacion.fechaCreacion),
        ultimaActividad:Timestamp.fromDate(conversacion.ultimaActividad),
        //conversion de la fecha de mensaje
        mensajes: conversacion.mensajes.map(mensaje =>({
          ...mensaje,
          fechaEnvio: Timestamp.fromDate(mensaje.fechaEnvio)
        }))
      }
      await addDoc(coleccionConversaciones, converacionParaGuardar);
    }catch(error){
      console.error( '✖️ Error al guardar la conversacion',  error);
      throw error;
    }




  }



}





