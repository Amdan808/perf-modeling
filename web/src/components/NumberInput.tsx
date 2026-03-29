type NumberInputProps = {
  value: number
  step: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

function NumberInput(props: NumberInputProps) {
  const { value, step, min, max, onChange } = props

  return (
    <input
      type="number"
      className="number-field"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(event) => {
        const next = Number(event.currentTarget.value)
        if (Number.isFinite(next)) {
          onChange(next)
        }
      }}
    />
  )
}

export default NumberInput
