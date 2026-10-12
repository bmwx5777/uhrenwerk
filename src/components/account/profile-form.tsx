"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/server/actions/account";

type ProfileFormProps = {
  name: string;
  phone: string | null;
  email: string;
};

export function ProfileForm({ name, phone, email }: ProfileFormProps) {
  const { formAction, isPending, fieldError } = useFormAction(updateProfileAction);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <Field label="Имя" error={fieldError("name")} required>
        {(control) => (
          <Input
            name="name"
            defaultValue={name}
            autoComplete="name"
            required
            {...control}
          />
        )}
      </Field>

      <Field
        label="Телефон"
        hint="Нужен курьеру при доставке"
        error={fieldError("phone")}
      >
        {(control) => (
          <Input
            name="phone"
            type="tel"
            defaultValue={phone ?? ""}
            autoComplete="tel"
            {...control}
          />
        )}
      </Field>

      <Field label="Email">
        {(control) => <Input value={email} readOnly disabled {...control} />}
      </Field>
      <p className="-mt-3 text-xs text-subtle">
        Адрес входа изменить нельзя — напишите нам, если нужно его заменить.
      </p>

      <Button type="submit" isPending={isPending} className="mt-2 self-start">
        Сохранить
      </Button>
    </form>
  );
}
