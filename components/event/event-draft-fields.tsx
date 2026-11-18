import type { ComponentProps } from 'react';
import { FormInput } from '@/components/ui/form-input';
import { FormTextarea } from '@/components/ui/form-textarea';

interface EventDraftFieldsProps {
  idPrefix: string;
  name: string;
  websiteUrl: string;
  description: string;
  labels: { name: string; websiteUrl: string; description: string };
  onNameChange: (value: string) => void;
  onWebsiteUrlChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  disabled?: boolean;
  layout?: 'columns' | 'stacked';
  websiteType?: 'text' | 'url';
  websitePlaceholder?: string;
  descriptionOptions?: Pick<ComponentProps<typeof FormTextarea>, 'rows' | 'maxLength' | 'showCharacterCount' | 'className'>;
}

export function EventDraftFields({
  idPrefix,
  name,
  websiteUrl,
  description,
  labels,
  onNameChange,
  onWebsiteUrlChange,
  onDescriptionChange,
  disabled,
  layout = 'stacked',
  websiteType,
  websitePlaceholder,
  descriptionOptions,
}: EventDraftFieldsProps) {
  return (
    <div className={layout === 'columns' ? 'flex flex-col gap-4' : 'flex flex-col gap-3'}>
      <div className={layout === 'columns' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8' : 'flex flex-col gap-3'}>
        <FormInput
          id={`${idPrefix}-name`}
          label={labels.name}
          value={name}
          disabled={disabled}
          onChange={(event) => onNameChange(event.target.value)}
        />
        <FormInput
          id={`${idPrefix}-website-url`}
          label={labels.websiteUrl}
          type={websiteType}
          value={websiteUrl}
          placeholder={websitePlaceholder}
          disabled={disabled}
          onChange={(event) => onWebsiteUrlChange(event.target.value)}
        />
      </div>
      <FormTextarea
        id={`${idPrefix}-description`}
        label={labels.description}
        value={description}
        disabled={disabled}
        onChange={(event) => onDescriptionChange(event.target.value)}
        {...descriptionOptions}
      />
    </div>
  );
}
