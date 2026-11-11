import { createBrowserRouter, Navigate } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  GraduationCap,
  Library,
  Network,
} from 'lucide-react'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { AuthCallbackPage } from '@/features/auth/AuthCallbackPage'
import { SetupPage } from '@/features/auth/SetupPage'
import { OnboardingPage } from '@/features/auth/OnboardingPage'
import { PublicOnly, RequireAuth, RequireOnboarded } from '@/features/auth/require-auth'
import { HomePage } from '@/features/dashboard/HomePage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { SubjectFormPage } from '@/features/subjects/SubjectFormPage'
import { SubjectDetailPage } from '@/features/subjects/SubjectDetailPage'
import { ComingSoonPage } from '@/features/coming-soon/ComingSoonPage'
import { LegalPage } from '@/features/legal/LegalPage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/ingresar',
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: '/crear-cuenta',
    element: (
      <PublicOnly>
        <RegisterPage />
      </PublicOnly>
    ),
  },
  {
    path: '/recuperar-contrasena',
    element: (
      <PublicOnly>
        <ForgotPasswordPage />
      </PublicOnly>
    ),
  },
  {
    path: '/restablecer-contrasena',
    element: <ResetPasswordPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    path: '/configuracion-inicial',
    element: <SetupPage />,
  },
  {
    path: '/bienvenida',
    element: (
      <RequireAuth>
        <OnboardingPage />
      </RequireAuth>
    ),
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
      { path: 'inicio', element: <HomePage /> },
      {
        path: 'calendario',
        element: (
          <ComingSoonPage
            title="Calendario"
            phase="Fase 3"
            description="Tareas, exámenes y vencimientos en una vista mensual, semanal y de agenda."
            icon={CalendarDays}
          />
        ),
      },
      {
        path: 'horario',
        element: (
          <ComingSoonPage
            title="Horario"
            phase="Fase 4"
            description="Tu grilla semanal de clases, descansos y actividades, con el detalle de cada bloque."
            icon={Clock3}
          />
        ),
      },
      {
        path: 'calificaciones',
        element: (
          <ComingSoonPage
            title="Calificaciones"
            phase="Fase 4"
            description="Evaluaciones con pesos, escala configurable, promedio y proyección por materia."
            icon={GraduationCap}
          />
        ),
      },
      {
        path: 'nodos',
        element: (
          <ComingSoonPage
            title="Nodos de conocimiento"
            phase="Fase 5"
            description="El mapa de temas de tu año, con dificultad, dominio y conexiones entre materias."
            icon={Network}
          />
        ),
      },
      {
        path: 'biblioteca',
        element: (
          <ComingSoonPage
            title="Biblioteca"
            phase="Fase 6"
            description="Fuentes, documentos, enlaces y materiales vinculados a tus temas y tareas."
            icon={Library}
          />
        ),
      },
      { path: 'perfil', element: <ProfilePage /> },
      { path: 'configuracion', element: <SettingsPage /> },
      { path: 'asignaturas/nueva', element: <SubjectFormPage /> },
      { path: 'asignaturas/:id', element: <SubjectDetailPage /> },
      { path: 'asignaturas/:id/editar', element: <SubjectFormPage /> },
      { path: 'asignaturas/:id/informacion', element: <SubjectDetailPage /> },
      {
        path: 'asignaturas/:id/calendario',
        element: (
          <ComingSoonPage
            title="Calendario de la asignatura"
            phase="Fase 3"
            description="Tareas y exámenes de esta materia, con su color y sus vencimientos."
            icon={CalendarDays}
          />
        ),
      },
      {
        path: 'asignaturas/:id/nodos',
        element: (
          <ComingSoonPage
            title="Nodos de la asignatura"
            phase="Fase 5"
            description="El árbol de temas de esta materia, con dificultad, dominio y conexiones."
            icon={Network}
          />
        ),
      },
      {
        path: 'asignaturas/:id/calificaciones',
        element: (
          <ComingSoonPage
            title="Calificaciones de la asignatura"
            phase="Fase 4"
            description="Evaluaciones, pesos y promedio de esta materia."
            icon={GraduationCap}
          />
        ),
      },
      {
        path: 'asignaturas/:id/biblioteca',
        element: (
          <ComingSoonPage
            title="Biblioteca de la asignatura"
            phase="Fase 6"
            description="Fuentes y materiales vinculados a los temas de esta materia."
            icon={Library}
          />
        ),
      },
    ],
  },
  {
    path: '/legal/:kind',
    element: <LegalPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
