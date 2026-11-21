export const primaryButtonClass =
  'inline-flex items-center justify-center rounded-[2px] border-0 bg-signal px-3 py-2 text-ui font-medium text-white hover:bg-signal-press'

export const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-[2px] border border-solid border-line bg-panel px-3 py-2 text-ui font-medium text-ink hover:bg-hover-panel disabled:bg-panel disabled:text-secondary disabled:opacity-100'

export const dangerButtonClass =
  'inline-flex items-center justify-center rounded-[2px] border border-solid border-danger bg-panel px-3 py-2 text-ui font-medium text-danger hover:bg-panel'

export const confirmButtonClass =
  'inline-flex items-center justify-center rounded-[2px] border-0 bg-danger px-3 py-2 text-ui font-medium text-white hover:bg-danger-press'

export const fieldClass =
  'w-full rounded-[2px] border border-solid border-line bg-panel px-3 py-2 text-ui font-medium text-ink placeholder:text-secondary'

interface PowerSwitchProps {
  live: boolean
  on: boolean
  label: string
  testId: string
  title?: string
  onClick: () => void
}

export function PowerSwitch({ live, on, label, testId, title, onClick }: PowerSwitchProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={`power-switch ${live ? 'power-switch-live' : 'power-switch-idle'}`}
      aria-label={label}
      title={title}
      onClick={onClick}
    >
      <span className={`power-thumb ${on ? 'power-thumb-on' : 'power-thumb-off'}`} />
    </button>
  )
}
