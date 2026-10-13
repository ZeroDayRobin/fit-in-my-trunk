// Nicht-reaktiver Zwischenspeicher für die laufende Drag-Geste (Greif-Versatz),
// damit nicht jede Mausbewegung einen React-Render auslöst.
export const dragSession = {
  offset: [0, 0] as [number, number],
};
