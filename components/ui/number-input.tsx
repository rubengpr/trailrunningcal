'use client';

import type {
  InputHTMLAttributes,
  ReactElement,
  WheelEventHandler,
} from 'react';

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function NumberInput({
  onWheel,
  ...props
}: NumberInputProps): ReactElement {
  const handleWheel: WheelEventHandler<HTMLInputElement> = (event) => {
    event.currentTarget.blur();
    onWheel?.(event);
  };

  return <input {...props} type="number" onWheel={handleWheel} />;
}
