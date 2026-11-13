import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { PublicOnly, RequireAuth, RequireOnboarded } from '@/features/auth/require-auth'

/**
 * Cada pantalla se carga aparte (Fase 8): la primera carga solo trae el
 * enrutador, la sesión y el marco de la app, y cada ruta baja su código la
 * primera vez que se abre. La PWA igual las guarda todas para usar sin conexión.
 */
function lazyPage<Module>(load: () => Promise<Module>, pick: (module: Module) => ComponentType) {
  return async () => ({ Component: pick(await load()) })
}

export const router = createBrowserRouter([
  {
    element: (
      <PublicOnly>
        <Outlet />
      </PublicOnly>
    ),
    children: [
      {
        path: '/ingresar',
        lazy: lazyPage(
          () => import('@/features/auth/LoginPage'),
          (m) => m.LoginPage,
        ),
      },
      {
        path: '/crear-cuenta',
        lazy: lazyPage(
          () => import('@/features/auth/RegisterPage'),
          (m) => m.RegisterPage,
        ),
      },
      {
        path: '/recuperar-contrasena',
        lazy: lazyPage(
          () => import('@/features/auth/ForgotPasswordPage'),
          (m) => m.ForgotPasswordPage,
        ),
      },
    ],
  },
  {
    path: '/restablecer-contrasena',
    lazy: lazyPage(
      () => import('@/features/auth/ResetPasswordPage'),
      (m) => m.ResetPasswordPage,
    ),
  },
  {
    path: '/auth/callback',
    lazy: lazyPage(
      () => import('@/features/auth/AuthCallbackPage'),
      (m) => m.AuthCallbackPage,
    ),
  },
  {
    path: '/configuracion-inicial',
    lazy: lazyPage(
      () => import('@/features/auth/SetupPage'),
      (m) => m.SetupPage,
    ),
  },
  {
    path: '/bienvenida',
    element: (
      <RequireAuth>
        <Outlet />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        lazy: lazyPage(
          () => import('@/features/auth/OnboardingPage'),
          (m) => m.OnboardingPage,
        ),
      },
    ],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <RequireOnboarded>
          <AppLayout />
        </RequireOnboarded>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/inicio" replace /> },
      {
        path: 'inicio',
        lazy: lazyPage(
          () => import('@/features/dashboard/HomePage'),
          (m) => m.HomePage,
        ),
      },
      {
        path: 'calendario',
        lazy: lazyPage(
          () => import('@/features/calendar/CalendarPage'),
          (m) => m.CalendarPage,
        ),
      },
      {
        path: 'horario',
        lazy: lazyPage(
          () => import('@/features/schedule/SchedulePage'),
          (m) => m.SchedulePage,
        ),
      },
      {
        path: 'calificaciones',
        lazy: lazyPage(
          () => import('@/features/grades/GradesPage'),
          (m) => m.GradesPage,
        ),
      },
      {
        path: 'nodos',
        lazy: lazyPage(
          () => import('@/features/nodes/NodesPage'),
          (m) => m.NodesPage,
        ),
      },
      {
        path: 'biblioteca',
        lazy: lazyPage(
          () => import('@/features/library/LibraryPage'),
          (m) => m.LibraryPage,
        ),
      },
      {
        path: 'perfil',
        lazy: lazyPage(
          () => import('@/features/profile/ProfilePage'),
          (m) => m.ProfilePage,
        ),
      },
      {
        path: 'configuracion',
        lazy: lazyPage(
          () => import('@/features/settings/SettingsPage'),
          (m) => m.SettingsPage,
        ),
      },
      {
        path: 'asignaturas/nueva',
        lazy: lazyPage(
          () => import('@/features/subjects/SubjectFormPage'),
          (m) => m.SubjectFormPage,
        ),
      },
      // Al entrar en una asignatura, lo primero que se ve es su calendario.
      {
        path: 'asignaturas/:id',
        lazy: lazyPage(
          () => import('@/features/calendar/SubjectCalendarPage'),
          (m) => m.SubjectCalendarPage,
        ),
      },
      {
        path: 'asignaturas/:id/calendario',
        lazy: lazyPage(
          () => import('@/features/calendar/SubjectCalendarPage'),
          (m) => m.SubjectCalendarPage,
        ),
      },
      {
        path: 'asignaturas/:id/editar',
        lazy: lazyPage(
          () => import('@/features/subjects/SubjectFormPage'),
          (m) => m.SubjectFormPage,
        ),
      },
      {
        path: 'asignaturas/:id/informacion',
        lazy: lazyPage(
          () => import('@/features/subjects/SubjectDetailPage'),
          (m) => m.SubjectDetailPage,
        ),
      },
      {
        path: 'asignaturas/:id/nodos',
        lazy: lazyPage(
          () => import('@/features/nodes/SubjectNodesPage'),
          (m) => m.SubjectNodesPage,
        ),
      },
      {
        path: 'asignaturas/:id/calificaciones',
        lazy: lazyPage(
          () => import('@/features/grades/SubjectGradesPage'),
          (m) => m.SubjectGradesPage,
        ),
      },
      {
        path: 'asignaturas/:id/biblioteca',
        lazy: lazyPage(
          () => import('@/features/library/SubjectLibraryPage'),
          (m) => m.SubjectLibraryPage,
        ),
      },
    ],
  },
  {
    path: '/legal/:kind',
    lazy: lazyPage(
      () => import('@/features/legal/LegalPage'),
      (m) => m.LegalPage,
    ),
  },
  {
    path: '*',
    lazy: lazyPage(
      () => import('@/features/errors/NotFoundPage'),
      (m) => m.NotFoundPage,
    ),
  },
])
