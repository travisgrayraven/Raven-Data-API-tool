
import React, { useState, useEffect, useRef } from 'react';
import type { Geofence, GeofenceFormData } from '../types';
import { useTranslation } from '../i18n/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

declare const L: any;

interface GeofenceEditorProps {
  mode: 'create' | 'edit';
  geofence?: Geofence | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: GeofenceFormData, layer: any) => Promise<void>;
  onDelete: (uuid: string) => Promise<void>;
}

export const GeofenceEditor: React.FC<GeofenceEditorProps> = ({ mode, geofence, isOpen, onSave, onClose, onDelete }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<GeofenceFormData>({ name: '', description: '', end: '', notification: 'ENTER,EXIT' });
  const [radius, setRadius] = useState<string>('');
  const [editedLayer, setEditedLayer] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const drawControlRef = useRef<any>(null);
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);


  const geofenceToLayer = (g: Geofence): any | null => {
    if (g.shape_type === 'POLYGON' && g.shape_data.coordinates) {
        return L.polygon(g.shape_data.coordinates);
    }
    if (g.shape_type === 'CIRCLE' && g.shape_data.center && g.shape_data.radius) {
        return L.circle(g.shape_data.center, { radius: g.shape_data.radius });
    }
    return null;
  }

  const triggerClose = () => {
    const drawControl = drawControlRef.current;
    if (drawControl?._toolbars) { 
        Object.values(drawControl._toolbars).forEach((toolbar: any) => {
            if (toolbar?._activeMode?.handler?.disable) {
                toolbar._activeMode.handler.disable();
            }
        });
    }
    onClose();
  };

  const isoToDateInputFormat = (isoString: string | null): string => {
    if (!isoString) return '';
    try {
        return new Date(isoString).toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
  };


  useEffect(() => {
    if (!isOpen) {
        return; 
    }

    if (mode === 'edit' && geofence) {
      setFormData({ 
        name: geofence.name, 
        description: geofence.description, 
        end: isoToDateInputFormat(geofence.end),
        notification: geofence.notification || ''
      });
      if (geofence.shape_type === 'CIRCLE' && geofence.shape_data.radius) {
        setRadius(String(Math.round(geofence.shape_data.radius)));
      } else {
        setRadius('');
      }
    } else {
      setFormData({ name: '', description: '', end: '', notification: 'ENTER,EXIT' });
      setRadius('');
    }
    setEditedLayer(null);
    setError(null);
  
    const initTimer = setTimeout(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, { preferCanvas: true }).setView([45.4215, -75.6972], 5);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawnItemsRef.current = drawnItems;

        const drawControl = new L.Control.Draw({
            edit: { featureGroup: drawnItems },
            draw: {
                polygon: true,
                circle: true,
                polyline: false,
                rectangle: false,
                marker: false,
                circlemarker: false,
            },
        });
        map.addControl(drawControl);
        drawControlRef.current = drawControl;
        
        (drawControl._container as HTMLElement).style.display = 'none';

        map.on(L.Draw.Event.CREATED, (e: any) => {
            const layer = e.layer;
            drawnItems.clearLayers();
            drawnItems.addLayer(layer);
            setEditedLayer(layer);
            if (layer instanceof L.Circle) {
                setRadius(String(Math.round(layer.getRadius())));
            } else {
                setRadius('');
            }
            if (mode === 'create') {
                (drawControl._container as HTMLElement).style.display = 'none';
            }
        });

        map.on(L.Draw.Event.EDITED, (e: any) => {
            const layer = e.layers.getLayers()[0];
            setEditedLayer(layer);
            if (layer instanceof L.Circle) {
                setRadius(String(Math.round(layer.getRadius())));
            } else {
                setRadius('');
            }
        });
        
        map.on(L.Draw.Event.DELETED, () => {
            setEditedLayer(null);
            setRadius('');
            if (mode === 'create') {
                (drawControl._container as HTMLElement).style.display = 'block';
            }
        });

        if (mode === 'edit' && geofence) {
            const initialLayer = geofenceToLayer(geofence);
            if (initialLayer) {
                drawnItems.addLayer(initialLayer);
                setEditedLayer(initialLayer);
            }
        } else {
            (drawControl._container as HTMLElement).style.display = 'block';
        }
    }, 100);

    const viewTimer = setTimeout(() => {
        const map = mapRef.current;
        const drawnItems = drawnItemsRef.current;
        if (!map || !drawnItems) return;

        map.invalidateSize();

        if (drawnItems.getLayers().length > 0) {
            const layer = drawnItems.getLayers()[0];
            if (layer instanceof L.Circle) {
                const center = layer.getLatLng();
                const zoom = map.getBoundsZoom(layer.getBounds());
                map.setView(center, zoom);
            } else {
                map.fitBounds(drawnItems.getBounds().pad(0.1));
            }
        } else {
            map.setView([45.4215, -75.6972], 5);
        }
    }, 300); 
  
    return () => {
      clearTimeout(initTimer);
      clearTimeout(viewTimer);
      
      const map = mapRef.current;
      if (map) {
        const drawControl = drawControlRef.current;
        if (drawControl?._toolbars) {
            Object.values(drawControl._toolbars).forEach((toolbar: any) => {
                if (toolbar?._activeMode?.handler?.disable) {
                    toolbar._activeMode.handler.disable();
                }
            });
        }
        
        map.remove();
        
        mapRef.current = null;
        drawControlRef.current = null;
        drawnItemsRef.current = null;
      }
    };
  }, [isOpen, mode, geofence]);
  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRadius(value);
    
    const numValue = parseFloat(value);
    if (editedLayer && editedLayer instanceof L.Circle && !isNaN(numValue) && numValue > 0) {
      editedLayer.setRadius(numValue);
    }
  };

  const handleSave = async () => {
    if (!editedLayer && mode === 'create') {
        setError(t('geofenceEditor.errorShapeRequired'));
        return;
    }
    if (!formData.name.trim()) {
        setError(t('geofenceEditor.errorNameRequired'));
        return;
    }

    // In edit mode, if no new layer was drawn, we use the original.
    // The API service function `updateGeofence` handles a null layer gracefully.
    const layerToSave = editedLayer || (mode === 'edit' ? null : editedLayer);


    setIsSaving(true);
    setError(null);
    try {
      await onSave(formData, layerToSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!geofence) return;
    
    const isConfirmed = window.confirm(t('geofenceEditor.deleteConfirm', { name: geofence.name }));

    if (isConfirmed) {
        setIsDeleting(true);
        setError(null);
        try {
            await onDelete(geofence.uuid);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.unknown'));
            setIsDeleting(false);
        }
    }
  };

  if (!isOpen) return null;
  const isLoading = isSaving || isDeleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4" onClick={triggerClose}>
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="geofence-editor-title"
      >
        <header className="flex justify-between items-center p-4 border-b border-soft-grey dark:border-gray-700 flex-shrink-0">
            <h2 id="geofence-editor-title" className="text-xl font-bold">{mode === 'create' ? t('geofenceEditor.createTitle') : t('geofenceEditor.editTitle')}</h2>
            <button onClick={triggerClose} className="p-1 text-2xl" aria-label={t('geofenceEditor.closeAriaLabel')}>&times;</button>
        </header>

        <div className="flex flex-col md:flex-row flex-grow min-h-0">
            <main className="w-full md:w-2/3 h-64 md:h-auto order-2 md:order-1">
                 <div ref={mapContainerRef} className="h-full w-full" role="application" aria-label={t('geofenceEditor.mapLabel')} />
            </main>

            <aside className="w-full md:w-1/3 p-4 space-y-4 overflow-y-auto order-1 md:order-2 border-b md:border-b-0 md:border-l border-soft-grey dark:border-gray-700">
                {!editedLayer && mode === 'create' && (
                    <div className="text-center p-4 bg-raven-blue/10 dark:bg-raven-blue/20 rounded-lg">
                        <p className="text-sm text-raven-blue dark:text-sky-blue">{t('geofenceEditor.drawPrompt')}</p>
                    </div>
                )}
                <div>
                    <label htmlFor="name" className="block text-sm font-medium">{t('geofenceEditor.nameLabel')}</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue"/>
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium">{t('geofenceEditor.descriptionLabel')}</label>
                    <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={3} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue" />
                </div>
                 {editedLayer && (editedLayer instanceof L.Circle) && (
                    <div>
                        <label htmlFor="radius" className="block text-sm font-medium">{t('geofenceEditor.radiusLabel')}</label>
                        <input
                          type="number"
                          name="radius"
                          id="radius"
                          value={radius}
                          onChange={handleRadiusChange}
                          className="mt-1 block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
                          min="1"
                        />
                    </div>
                )}
                <div>
                    <label htmlFor="notification" className="block text-sm font-medium">{t('geofenceEditor.notificationsLabel')}</label>
                    <select name="notification" id="notification" value={formData.notification} onChange={handleInputChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue">
                        <option value="">{t('geofenceEditor.notifyNone')}</option>
                        <option value="ENTER">{t('geofenceEditor.notifyOnEnter')}</option>
                        <option value="EXIT">{t('geofenceEditor.notifyOnExit')}</option>
                        <option value="ENTER,EXIT">{t('geofenceEditor.notifyOnEnterExit')}</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="end" className="block text-sm font-medium">{t('geofenceEditor.expirationLabel')}</label>
                    <div className="flex items-center">
                        <input type="date" name="end" id="end" value={formData.end} onChange={handleInputChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue dark:[color-scheme:dark]" />
                        {formData.end && (
                            <button onClick={() => setFormData(prev => ({...prev, end: ''}))} className="ml-2 p-1 text-gray-400 hover:text-gray-600" aria-label={t('geofenceEditor.clearDate')}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                     <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('geofenceEditor.expirationHelp')}</p>
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </aside>
        </div>

        <footer className="flex justify-between items-center gap-3 p-4 border-t border-soft-grey dark:border-gray-700 flex-shrink-0">
            <div>
                {mode === 'edit' && (
                    <button 
                        onClick={handleDelete} 
                        disabled={isLoading} 
                        className="py-2 px-4 border border-alert-red rounded-md shadow-sm text-sm font-medium text-alert-red hover:bg-alert-red/10 disabled:opacity-50"
                    >
                        {isDeleting ? t('common.deleting') : t('common.delete')}
                    </button>
                )}
            </div>
            <div className="flex gap-3">
                <button onClick={triggerClose} disabled={isLoading} className="py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium">{t('common.cancel')}</button>
                <button onClick={handleSave} disabled={isLoading} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 disabled:bg-raven-blue/50">
                    {isSaving ? t('common.saving') : t('common.saveChanges')}
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};