import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit, OnDestroy } from '@angular/core';
import { MensajeChat } from '../../../models/chat';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService, } from '../../services/auth';
import { ChatService } from '../../services/chat';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { User } from '@angular/fire/auth';
 


@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})

//crear un usuario
export class Chat implements OnInit, AfterViewChecked, OnDestroy {

  usuario: User | null = null;
  mensajes: MensajeChat[] = [];
  mensajeTexto = '';

  enviandoMensaje = false;
  asistenteEscribiendo = false;

  cargandoHistorial = false;
  mensajeError = '';
  private suscripciones: Subscription[] = [];

  private authService = inject(AuthService);
  private ChatService = inject(ChatService);
  private router = inject(Router);





  private debeHacerScroll = false;


  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  ngOnDestroy(): void {
    //cancelar el componente se quitan las suscripciones
    this.suscripciones.forEach(sub => sub.unsubscribe());
  }

  private ScrollHaciaAbajo(): void {
    try {
      const container = this.messagesContainer.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    } catch (error) {
      console.error('✖️ Error al hacer scroll');
    }
  }

  ngAfterViewChecked(): void {
    if (this.debeHacerScroll) {
      this.ScrollHaciaAbajo();
      this.debeHacerScroll = false;
    }
  }

  trackByMensaje(index: number, mensaje: MensajeChat) {

  }

  fomatearMensajeAsistente(contenido: string): string {
    return contenido
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\+/g, '<em>$1</em>')
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.VerificarAutenticacion();
      await this.inicializarChat();
      this.configurarSuscripciones();
    } catch (error) {
      console.error('Error al inicializar el chat funcion chat');
      this.mensajeError = 'Error al inicializar el chat';
    }
  }

  private async VerificarAutenticacion(): Promise<void> {
    this.usuario = this.authService.obtenerUsuarioAactual();
    console.log('ingreso el verificador de autenticacion');

    if (!this.usuario) {
      console.log('ingreso el verificador de autenticacion if');
      await this.router.navigate(['/auth']);
      throw new Error('Usuario no autenticado');
    }

  }

  private async inicializarChat(): Promise<void> {
    console.log('ingreso el verificador de autenticacion inicializar chat');
    if (!this.usuario) {
      return;
    }
    this.cargandoHistorial = true;
    try {
      await this.ChatService.inicializandoChat(this.usuario.uid)
    } catch (error) {
      console.error('Error al inicializar el componente', error)
      throw error;
    } finally {
      this.cargandoHistorial = false;
    }
  }

  private configurarSuscripciones(): void {
    //suscribirse a los mensajes del chat
    const susbMensajes = this.ChatService.mensajes$.subscribe(mensajes => {
      this.mensajes = mensajes;
      this.debeHacerScroll = true;
    });
    const susAsistente = this.ChatService.asistenteRespondiendo$.subscribe(respondiendo => {
      this.asistenteEscribiendo = respondiendo;
      if (!respondiendo) {
        this.debeHacerScroll
      }
    });
    this.suscripciones.push(susbMensajes, susAsistente);
  }

  async enviarMensaje(): Promise<void> {
    if (!this.mensajeTexto.trim()) {
      return;
    }
    //por si hay mensajes Previos se eliminan
    this.mensajeError = '';
    this.enviandoMensaje = true;

    const texto = this.mensajeTexto.trim();
    this.mensajeTexto = '';

    try {
      // enviamos el mensaje utilizando el servicio de chat
      await this.ChatService.enviarMensaje(texto);

      this.enfocarInput();
    } catch (error: any) {
      console.error('Error al enviar el mensaje', error);
      this.mensajeError = error.message || 'Error al enviar el mensaje';
      // restaurar el texto en el input
      this.mensajeTexto = texto
    } finally {
      this.enviandoMensaje = false;
    }
  }

  async cerrarSesion(): Promise<void> {
    try {
      this.ChatService.limpiarChat();
      await this.authService.cerrarSesion();
      await this.router.navigate(['/auth']);

    } catch (error) {
      console.error('No se pudo cerrar sesion: ', error);
      this.mensajeError = 'Error al cerrar sesion';
    }
  }

  manejarTeclaPresionada(evento: KeyboardEvent): void {
    //enter sin shift
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      this.enviarMensaje();
    }
  }

  enfocarInput(): void {
    setTimeout(() => {
      this.messageInput.nativeElement.focus();
    }, 100)
  }

  formatearHora(fecha: Date): string {
    return fecha.toLocaleTimeString('es-Es', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  manejoErrorImagen(evento: any): void {
    evento.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOC42ODYyOSAxNCA2IDE2LjY4NjMgNiAyMEg2VjIySDZIMThINlYyMEM2IDE2LjY4NjMgMTUuMzEzNyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
  }





























}