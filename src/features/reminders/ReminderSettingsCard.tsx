import { useMemo, useState } from 'react'
import {
  Bell,
  BellOff,
  BookOpen,
  Clock3,
  GraduationCap,
  Mail,
  Send,
  SquareCheck,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/features/auth/auth-provider'
import { SettingRow } from '@/features/settings/SettingRow'
import { useNow } from '@/hooks/use-now'
import { formatShortDayAndTime, resolveTimeZone } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'
import type { Reminder, ReminderKind } from '@/types/database'
import {
  REMINDER_KIND_LABELS,
  canCancel,
  canReschedule,
  canRestore,
  groupReminders,
  hasNoKinds,
  leadOptionsWith,
  reminderTitle,
  type ReminderPreferences,
} from './reminder-rules'
import {
  useReminderActions,
  useReminderPreferences,
  useReminders,
  useUpdateReminderPreferences,
} from './reminder-hooks'
import { RescheduleReminderDialog } from './RescheduleReminderDialog'

const KIND_ICONS: Record<ReminderKind, LucideIcon> = {
  task_due: SquareCheck,
  exam: GraduationCap,
  study_session: BookOpen,
  custom: Mail,
}

const VISIBLE_UPCOMING = 6

const iconButtonClass =
  'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-ink-muted transition hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/40 disabled:cursor-not-allowed disabled:opacity-50'

function ReminderItem({
  reminder,
  timeZone,
  now,
  busy,
  onCancel,
  onRestore,
  onReschedule,
}: {
  reminder: Reminder
  timeZone: string
  now: Date
  busy: boolean
  onCancel?: () => void
  onRestore?: () => void
  onReschedule?: () => void
}) {
  const Icon = KIND_ICONS[reminder.kind]
  const title = reminderTitle(reminder)
  const cancelled = reminder.status === 'cancelled'
  const overdue = reminder.status === 'scheduled' && new Date(reminder.send_at) <= now
  const showActions = Boolean(onCancel || onRestore || onReschedule)

  let meta: string
  let tone = 'text-ink-muted'

  if (reminder.status === 'sent') {
    meta = `Enviado ${formatShortDayAndTime(reminder.sent_at ?? reminder.updated_at, timeZone)}`
  } else if (reminder.status === 'failed') {
    meta = 'No se pudo enviar'
    tone = 'text-danger'
  } else if (cancelled) {
    meta = `Cancelado · iba a salir ${formatShortDayAndTime(reminder.send_at, timeZone)}`
  } else if (overdue) {
    meta = 'Sale en los próximos minutos'
  } else {
    meta = `Sale ${formatShortDayAndTime(reminder.send_at, timeZone)}`
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-line bg-sunken/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white/5 ${cancelled ? 'text-ink-disabled' : 'text-rose-bright'}`}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-semibold ${cancelled ? 'text-ink-muted' : 'text-ink'}`}
          >
            {title}
          </p>
          <p className={`mt-0.5 text-xs ${tone}`} title={reminder.error_message ?? undefined}>
            <span className="text-ink-disabled">{REMINDER_KIND_LABELS[reminder.kind]}</span> ·{' '}
            {meta}
          </p>
          {reminder.status === 'failed' && reminder.error_message ? (
            <p className="mt-0.5 line-clamp-2 break-words text-[11px] leading-4 text-ink-disabled">
              {reminder.error_message}
            </p>
          ) : null}
        </div>
      </div>

      {showActions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1 pl-11 sm:pl-0">
          {onReschedule ? (
            <button
              type="button"
              className={iconButtonClass}
              onClick={onReschedule}
              disabled={busy}
              aria-label={`Cambiar la hora del aviso de ${title}`}
            >
              <Clock3 className="h-3.5 w-3.5" />
              Cambiar hora
            </button>
          ) : null}
          {onRestore ? (
            <button
              type="button"
              className={iconButtonClass}
              onClick={onRestore}
              disabled={busy}
              aria-label={`Reactivar el aviso de ${title}`}
            >
              <Bell className="h-3.5 w-3.5" />
              Reactivar
            </button>
          ) : null}
          {onCancel ? (
            <button
              type="button"
              className={`${iconButtonClass} hover:bg-danger/10 hover:text-danger`}
              onClick={onCancel}
              disabled={busy}
              aria-label={`Cancelar el aviso de ${title}`}
            >
              <BellOff className="h-3.5 w-3.5" />
              Cancelar
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

/** Preferencias y lista de recordatorios por correo (Fase 7). */
export function ReminderSettingsCard() {
  const { user, profile } = useAuth()
  const userId = user?.id ?? ''
  const timeZone = resolveTimeZone(profile?.timezone)
  const now = useNow()
  const settings = useReminderPreferences(user?.id)
  const preferences = settings.preferences
  const update = useUpdateReminderPreferences(userId)
  const remindersQuery = useReminders(user?.id)
  const actions = useReminderActions(userId)
  const [rescheduling, setRescheduling] = useState<Reminder | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const groups = useMemo(
    () => groupReminders(remindersQuery.data ?? [], now),
    [remindersQuery.data, now],
  )
  const visibleUpcoming = showAll ? groups.upcoming : groups.upcoming.slice(0, VISIBLE_UPCOMING)
  const enabled = preferences.email_reminders_enabled
  const email = user?.email ?? 'el correo de tu cuenta'
  const disabled = !settings.data || update.isPending

  async function save(patch: Partial<ReminderPreferences>, message?: string) {
    try {
      await update.mutateAsync(patch)

      if (message) {
        toast.success(message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'No pudimos guardar tus preferencias.'))
    }
  }

  async function runAction(reminder: Reminder, action: 'cancel' | 'restore', message: string) {
    setBusyId(reminder.id)

    try {
      await actions[action].mutateAsync(reminder.id)
      toast.success(message)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No pudimos actualizar el recordatorio.'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleTest() {
    try {
      await actions.test.mutateAsync()
      toast.success(`Correo de prueba en camino a ${email}. Llega en los próximos minutos.`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No pudimos programar el correo de prueba.'))
    }
  }

  return (
    <Card id="recordatorios">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Recordatorios por correo</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">
              Te avisamos antes de cada vencimiento, examen o sesión de estudio.
            </p>
          </div>
          {settings.data ? (
            <Badge variant={enabled ? 'success' : 'muted'}>
              {enabled ? 'Activados' : 'Apagados'}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {settings.isError ? (
          <Alert variant="error">No pudimos cargar tus preferencias de correo.</Alert>
        ) : null}

        <div>
          <SettingRow
            title="Recibir recordatorios"
            titleId="reminders-enabled-label"
            description={
              enabled
                ? `Llegan a ${email}, el correo de tu cuenta.`
                : 'No se programa ningún correo mientras estén apagados.'
            }
          >
            <Switch
              checked={enabled}
              disabled={disabled}
              aria-labelledby="reminders-enabled-label"
              onCheckedChange={(checked) =>
                void save(
                  { email_reminders_enabled: checked },
                  checked ? 'Recordatorios activados.' : 'Recordatorios apagados.',
                )
              }
            />
          </SettingRow>

          {enabled ? (
            <>
              <SettingRow
                title="Anticipación"
                titleId="reminders-lead-label"
                description="Cuánto antes del evento llega el aviso."
              >
                <div className="w-full sm:w-48">
                  <Select
                    aria-labelledby="reminders-lead-label"
                    value={String(preferences.default_reminder_minutes)}
                    disabled={disabled}
                    onChange={(event) =>
                      void save(
                        { default_reminder_minutes: Number(event.target.value) },
                        'Anticipación guardada. Los avisos pendientes se reprogramaron.',
                      )
                    }
                  >
                    {leadOptionsWith(preferences.default_reminder_minutes).map((option) => (
                      <option key={option.minutes} value={option.minutes}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </SettingRow>

              <div
                role="group"
                aria-labelledby="reminders-kinds-label"
                className="space-y-3 border-b border-line/70 py-4"
              >
                <p id="reminders-kinds-label" className="text-sm font-semibold text-ink">
                  Qué avisar
                </p>
                <Checkbox
                  id="remind-tasks"
                  label="Tareas y proyectos"
                  description="Antes del vencimiento, mientras no estén terminados."
                  checked={preferences.remind_tasks}
                  disabled={disabled}
                  onChange={(event) => void save({ remind_tasks: event.target.checked })}
                />
                <Checkbox
                  id="remind-exams"
                  label="Exámenes"
                  checked={preferences.remind_exams}
                  disabled={disabled}
                  onChange={(event) => void save({ remind_exams: event.target.checked })}
                />
                <Checkbox
                  id="remind-sessions"
                  label="Sesiones de estudio"
                  description="Las del plan de estudio de cada examen. Pueden ser muchas."
                  checked={preferences.remind_study_sessions}
                  disabled={disabled}
                  onChange={(event) => void save({ remind_study_sessions: event.target.checked })}
                />
                {hasNoKinds(preferences) ? (
                  <Alert variant="warning">
                    No elegiste ningún tipo de aviso: no se va a enviar nada.
                  </Alert>
                ) : null}
              </div>

              <SettingRow
                title="Correo de prueba"
                description="Para comprobar que los avisos llegan (y que no van a spam)."
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleTest()}
                  loading={actions.test.isPending}
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                >
                  Enviar prueba
                </Button>
              </SettingRow>
            </>
          ) : null}
        </div>

        {enabled || groups.upcoming.length > 0 ? (
          <section aria-labelledby="reminders-upcoming-title" className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 id="reminders-upcoming-title" className="text-sm font-semibold text-ink">
                Próximos avisos
              </h3>
              {groups.upcoming.length > 0 ? (
                <span className="text-xs text-ink-muted">{groups.upcoming.length}</span>
              ) : null}
            </div>

            {remindersQuery.isLoading ? (
              <p className="py-3 text-sm text-ink-muted">Cargando avisos…</p>
            ) : groups.upcoming.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line-strong/70 px-4 py-5 text-center text-xs leading-5 text-ink-muted">
                No hay avisos programados. Se crean solos cuando agregás tareas, exámenes o sesiones
                con fecha futura.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {visibleUpcoming.map((reminder) => (
                    <ReminderItem
                      key={reminder.id}
                      reminder={reminder}
                      timeZone={timeZone}
                      now={now}
                      busy={busyId === reminder.id}
                      onCancel={
                        canCancel(reminder)
                          ? () => void runAction(reminder, 'cancel', 'Aviso cancelado.')
                          : undefined
                      }
                      onRestore={
                        canRestore(reminder, now)
                          ? () => void runAction(reminder, 'restore', 'Aviso reactivado.')
                          : undefined
                      }
                      onReschedule={
                        canReschedule(reminder, now) ? () => setRescheduling(reminder) : undefined
                      }
                    />
                  ))}
                </ul>
                {groups.upcoming.length > VISIBLE_UPCOMING ? (
                  <Button variant="ghost" size="sm" onClick={() => setShowAll((value) => !value)}>
                    {showAll ? 'Mostrar menos' : `Ver los ${groups.upcoming.length}`}
                  </Button>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        {groups.history.length > 0 ? (
          <section aria-labelledby="reminders-history-title" className="space-y-2">
            <h3 id="reminders-history-title" className="text-sm font-semibold text-ink">
              Últimos correos
            </h3>
            <ul className="space-y-2">
              {groups.history.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  timeZone={timeZone}
                  now={now}
                  busy={false}
                />
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-[11px] leading-5 text-ink-disabled">
          Los avisos se revisan cada 5 minutos. Si cambiás la fecha de una tarea, un examen o una
          sesión, el aviso se reprograma solo; si la hora del aviso ya pasó, no se manda.
        </p>
      </CardContent>

      <RescheduleReminderDialog
        reminder={rescheduling}
        timeZone={timeZone}
        loading={actions.reschedule.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduling(null)
          }
        }}
        onSubmit={async (sendAt) => {
          if (!rescheduling) {
            return
          }

          await actions.reschedule.mutateAsync({ id: rescheduling.id, sendAt })
          toast.success('Hora del aviso actualizada.')
          setRescheduling(null)
        }}
      />
    </Card>
  )
}
