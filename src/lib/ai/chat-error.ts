export function getChatErrorMessage(error: Error | undefined): string {
  if (!error?.message) {
    return 'Възникна грешка при връзката с асистента. Моля, опитайте отново.';
  }

  const message = error.message;

  if (message.includes('AI provider is not configured')) {
    return 'AI асистентът не е конфигуриран на сървъра (липсва ANTHROPIC_API_KEY).';
  }

  if (message.includes('Forbidden') || message.includes('Unauthorized')) {
    return 'Нямате достъп до AI асистента. Моля, влезте отново в профила си.';
  }

  if (message.includes('Too many requests')) {
    return 'Твърде много заявки. Изчакайте минута и опитайте отново.';
  }

  if (message.includes('model') || message.includes('not_found')) {
    return 'AI моделът не е наличен. Администраторът трябва да обнови ANTHROPIC_MODEL.';
  }

  return `Възникна грешка при връзката с асистента: ${message.slice(0, 180)}`;
}
