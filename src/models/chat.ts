export interface MensajeChat {
    id?: string,
    fechaEnvio : Date,
    contenido : string,
    usuario : string,
    tipo : 'usuario' | 'asistente', 
    estado? : 'enviado' | 'enviando' | 'error' | 'temporal' | 'recibido'
}

export interface conversacionChat {
    id? : string,
    usuarioId : string,
    mensajes : MensajeChat[],
    fechaCreacion : Date,
    ultimaActividad : Date,
    titulo : string,
} 