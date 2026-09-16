export async function submitInvoiceToNRA(signedXml: string) {
  if (process.env.ALLOW_INTEGRATION_SIMULATION === 'true') {
    return {
      success: true,
      referenceId: `NRA-SIM-${Date.now()}`,
      status: 'RECEIVED',
      simulated: true,
    };
  }

  return {
    success: false,
    error: 'НАП e-invoice API не е свързан. Не се връща фалшив приемен номер.',
  };
}

export async function checkInvoiceStatus(referenceId: string) {
  if (process.env.ALLOW_INTEGRATION_SIMULATION === 'true') {
    return {
      referenceId,
      status: 'PENDING',
      nraMessage: 'Симулация: статусът не е потвърден от НАП.',
      simulated: true,
    };
  }

  return {
    referenceId,
    status: 'UNKNOWN',
    nraMessage: 'Проверката към НАП не е конфигурирана.',
  };
}
