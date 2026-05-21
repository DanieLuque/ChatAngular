import { Injectable,inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, Observable, tap } from 'rxjs';


@Injectable({
  providedIn: 'root'
})

export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router)


  canActivate(): Observable<boolean>{
  return this.authService.estaAuntenticado$.pipe(
    tap(estaAutenticado => {
      if(!estaAutenticado){
        console.log("Acceso denegado, no estsa autenticado")
        this.router.navigate(['/auth']);
      }else{
        console.log("Acceso permitido,Usuario Autenticado")
      }
    }),
    map(estaAutenticado => estaAutenticado)
    );
  }
}
