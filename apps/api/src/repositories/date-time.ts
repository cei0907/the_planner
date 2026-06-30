export function toDbDateTime(value: string | null): string | null;
export function toDbDateTime(value: string | null | undefined): string | null | undefined;
export function toDbDateTime(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 23).replace("T", " ");
}

export function fromDbDateTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(`${value.replace(" ", "T")}Z`).toISOString();
}
