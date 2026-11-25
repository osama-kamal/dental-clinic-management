import {
  appointmentToUi,
  appointmentToBackend,
  inventoryToUi,
  inventoryToBackend,
  invoiceToUi,
} from './ipcClient';

describe('ipcClient field adapters', () => {
  it('maps a backend appointment to the shape the calendar renders', () => {
    const start = new Date(2026, 10, 25, 9, 0, 0);
    const ui = appointmentToUi(
      { id: 'a', patientId: 'p1', dentistId: 'd', startTime: start.toISOString(), duration: 45, appointmentType: 'Checkup', status: 'Scheduled' },
      { p1: 'Demo Patient One' }
    );
    expect(ui.appointmentDate).toBe('2026-11-25');
    expect(ui.startTime).toBe('09:00');
    expect(ui.endTime).toBe('09:45');
    expect(ui.patientName).toBe('Demo Patient One');
  });

  it('maps the appointment form back to start time and duration', () => {
    const b = appointmentToBackend({ patientId: 'p', dentistId: 'd', appointmentDate: '2026-11-25', startTime: '10:00', endTime: '10:30', reason: 'Cleaning' });
    expect(b.duration).toBe(30);
    expect(new Date(b.startTime).getHours()).toBe(10);
    expect(b.appointmentType).toBe('Cleaning');
  });

  it('maps inventory names and units both ways', () => {
    expect(inventoryToUi({ name: 'Gloves', unitOfMeasure: 'box' })).toMatchObject({ itemName: 'Gloves', unit: 'box' });
    expect(inventoryToBackend({ itemName: 'Gloves', category: 'c', unit: 'box', currentQuantity: '3', minimumThreshold: '5', unitCost: '12' }))
      .toEqual({ name: 'Gloves', category: 'c', unitOfMeasure: 'box', currentQuantity: 3, minimumThreshold: 5, unitCost: 12 });
  });

  it('maps invoices to the list shape', () => {
    const ui = invoiceToUi({ patientId: 'p1', totalAmount: 1200, createdAt: 'x', status: 'Partial' }, { p1: 'Demo' });
    expect(ui).toMatchObject({ total: 1200, patientName: 'Demo', status: 'Partially Paid' });
  });
});
