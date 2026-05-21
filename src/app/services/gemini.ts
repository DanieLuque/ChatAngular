import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';



interface PeticionGemini {
  contents: contentGemini[]; // contenido de gemini,
  generationConfig?: {
    maxOutputTokens?: number; // valor maximo de tokens de salida
    temperature?: number;
  }
  safetySettings?: SafetySetting[];
}

interface contentGemini {
  role: 'user' | 'model';
  parts: partGemini[] // va a ser una lista de partes de el prop que se le va a enviar a gemini
}

interface partGemini {
  text: string
}

interface SafetySetting {
  category: string;
  threshold: string
}

interface RespuestaGemini {
  candidates: {
    content: {
      parts: {
        text: string
      }[];
    };
    finish: string;
  }[];
  useMetaData?: {
    promtTokenCount: number;
    candidateTokenCount: number;
    totalTokenCount: number;
  }
}

@Injectable({
  providedIn: 'root',
})

export class GeminiService {
  private http = inject(HttpClient)

  private apiUrl = environment.gemini.apiUrl;
  private apiKey = environment.gemini.apiKey;

  enviarMensaje(mensaje: string, historialPrevio: contentGemini[] = []):
    // verificar que las key esten configuradas
    Observable<string> {
    if (!this.apiKey || this.apiKey === "tu_api_key_de_gemini") {
      return throwError(() => new Error('api key no configurada'));
    }

    //crear la constante de el encabezado - no vamos a envuiar la autorizacion por la cabeceradh
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    })

    // preparar el contenido de gemini para personalizar
    const mensajeSistema: contentGemini = {
      role: 'user',
      parts: [{
        text: "Eres un asistente virtual util y amigable. Responde siempre en español de manera clara y concisa.Eres especialista en ayudar con preguntas generales programacion y tecnologia. Manten un tono profecional pero crecano"
      }]
    };
    const repuestaSistema: contentGemini = {
      role: 'model',
      parts: [{
        text: "Entendido.Soy tu asistente virtual especializado en tecnologia y programacion te ayudare de manera clara y profecional en español.¿En que puedo ayudarte? "
      }]
    };
    const contenido: contentGemini[] = [
      mensajeSistema,
      repuestaSistema,
      ...historialPrevio, {
        role: 'user',
        parts: [{ text: mensaje }]
      }
    ];
    //configuraciones de seguridad para categorizar en temas tecnologicos
    const configuracionSeguridad: SafetySetting[] = [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ];

    const cuerpoPeticion: PeticionGemini = {
      contents: contenido,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,

      },
      safetySettings: configuracionSeguridad
    }

    const urlCompleta = `${this.apiUrl}?key=${this.apiKey}`;

    //return la peticion a gemini
    return this.http.post<RespuestaGemini>(urlCompleta, cuerpoPeticion, { headers })
      .pipe(
        // transformar la respuesta para que tenga un formato esperado
        map(respuesta => {
          // tenga un formato esperado
          if (respuesta.candidates && respuesta.candidates.length > 0) {
            const candidate = respuesta.candidates[0];

            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
              let contenidoRespuesta = candidate.content.parts[0].text;
              // validar si la respuesta es truncada por el numero de tokens


              if (candidate.finish === "MAX_TOKENS") {
                contenidoRespuesta += '\n\n [nota: respuesta truncada por limite de Tokens. Has otra solicitud]'
                return contenidoRespuesta;
              }
              return contenidoRespuesta;
            } else {
              throw new Error('Error en la respuesta de Gemini')
            }
          } else {
            throw new Error('La respuesta de gemini no tiene el formato solicitado')
          }
        }),
        catchError(error => {
          console.error('✖️ Error al comunicarse con gemini', error);
          //prsonalizacion del mensaje de error
          let mensajeError = 'Error al conectarse con Gemini';

          if (error.error?.error?.message) {
            mensajeError = error.error.error.message;
          } else if (error.status === 400) {
            mensajeError = "Peticion invalida Gemini. Verifica modelo y estructura del body"
          } else if (error.status === 403) {
            mensajeError = "Clave de API de Gemini invalida o sin permisos"
          } else if (error.status === 429) {
            mensajeError = "Has excedido el limite de peticiones"
          } else if (error.status === 500) {
            mensajeError = "Error servidor de Gemini. Intenta mas tarde"
          }
          return throwError(() => new Error(mensajeError));
        })
      );
  }
  convertirHistorialGemini(mensajes: any[]): contentGemini[] {
    const historialConverido: contentGemini[] = mensajes.map(msg => ({
      role: (msg.tipo === 'usuario' ? 'user' : 'model'),
      parts: [{ text: msg.contenido }]
    }));
    // validar que no se muestre demasiado historial

    if (historialConverido.length > 10) {
      const ultimosMensajes = historialConverido.slice(-10);

      if (ultimosMensajes.length > 0 && ultimosMensajes[0].role === 'model') {
        return ultimosMensajes.slice(1);
      }
      return ultimosMensajes
    }
    return historialConverido;


  }
  verificarConfiguraion(): boolean {
    //!! sirve para poner las expresiones en booleano 
    const configuracionValida = !!(this.apiKey && this.apiKey !== 'tu_api_key_de_gemini' && this.apiUrl);
    return configuracionValida;
  }
}
