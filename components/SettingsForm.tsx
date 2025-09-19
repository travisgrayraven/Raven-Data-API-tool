
import React, { useState, useEffect } from 'react';
import type { RavenSettings } from '../types';
import { useTranslation } from '../i18n/i18n';

// Reusable Accordion Component
const Accordion: React.FC<{ title: string; children: React.ReactNode, startOpen?: boolean }> = ({ title, children, startOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startOpen);
    const contentId = `accordion-content-${title.replace(/\s+/g, '-').toLowerCase()}`;
    
    return (
        <div className="border border-soft-grey dark:border-gray-700 rounded-md mb-2">
            <h3 className="m-0 text-base font-semibold">
                <button
                    className="w-full flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-left"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                >
                    {title}
                    <svg
                        className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
            </h3>
            {isOpen && <div id={contentId} role="region" className="p-4 border-t border-soft-grey dark:border-gray-700">{children}</div>}
        </div>
    );
};

// Form Control Components
interface ControlProps {
    label: string;
    path: string;
    value: any;
    onChange: (path: string, value: any) => void;
    helpText?: string;
}

const SettingsCheckbox: React.FC<ControlProps> = ({ label, path, value, onChange }) => (
    <div className="flex items-center justify-between py-2">
        <label htmlFor={path} className="text-sm font-medium">{label}</label>
        <input
            id={path}
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-raven-blue focus:ring-raven-blue"
            checked={!!value}
            onChange={(e) => onChange(path, e.target.checked)}
        />
    </div>
);

const SettingsDropdown: React.FC<ControlProps & { options: { value: string, label: string }[] }> = ({ label, path, value, onChange, options }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-2">
        <label htmlFor={path} className="text-sm font-medium">{label}</label>
        <select
            id={path}
            value={value || ''}
            onChange={(e) => onChange(path, e.target.value)}
            className="mt-1 sm:mt-0 block w-full sm:w-1/2 py-2 px-3 border border-gray-300 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-raven-blue focus:border-raven-blue sm:text-sm"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

const SettingsNumberInput: React.FC<ControlProps & { step?: number }> = ({ label, path, value, onChange, helpText, step = 1 }) => (
     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-2">
        <label htmlFor={path} className="text-sm font-medium">{label} {helpText && <span className="text-xs text-gray-500">({helpText})</span>}</label>
        <input
            id={path}
            type="number"
            step={step}
            value={value || 0}
            onChange={(e) => {
                const numValue = step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
                onChange(path, isNaN(numValue) ? 0 : numValue);
            }}
            className="mt-1 sm:mt-0 block w-full sm:w-1/2 py-2 px-3 border border-gray-300 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-raven-blue focus:border-raven-blue sm:text-sm"
        />
    </div>
);

const SettingsSlider: React.FC<ControlProps & { min: number, max: number }> = ({ label, path, value, onChange, min, max }) => (
    <div className="py-2">
        <div className="flex items-center justify-between">
            <label htmlFor={path} className="text-sm font-medium">{label}</label>
            <span className="text-sm font-semibold">{value}%</span>
        </div>
        <input
            id={path}
            type="range"
            min={min}
            max={max}
            value={value || 50}
            onChange={(e) => onChange(path, parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1"
        />
    </div>
);

// Main Settings Form
interface SettingsFormProps {
    settings: RavenSettings;
    onSettingChange: (path: string, value: any) => void;
}

// FIX: Update presets to use correct API keys and milli-G values. Braking is negative.
const vehicleCategoryPresets = [
  { name: 'light', values: { harsh_braking_accel_threshold: -450, aggressive_accel_threshold: 350, harsh_cornering_accel_threshold: 400, possible_impact_accel_threshold: 1500 } },
  { name: 'medium', values: { harsh_braking_accel_threshold: -500, aggressive_accel_threshold: 400, harsh_cornering_accel_threshold: 450, possible_impact_accel_threshold: 2000 } },
  { name: 'heavy', values: { harsh_braking_accel_threshold: -550, aggressive_accel_threshold: 450, harsh_cornering_accel_threshold: 500, possible_impact_accel_threshold: 2500 } }
];

export const SettingsForm: React.FC<SettingsFormProps> = ({ settings, onSettingChange }) => {
    const { t } = useTranslation();
    // FIX: Allow vehicle category to be null if settings don't match a preset.
    const [vehicleCategory, setVehicleCategory] = useState<number | null>(null);

    // Helper to get nested values safely
    const getValue = (path: string, defaultValue: any = false) => {
        const keys = path.split('.');
        let result = settings;
        for (const key of keys) {
            if (result && typeof result === 'object' && key in result) {
                result = result[key];
            } else {
                return defaultValue;
            }
        }
        return result;
    };

    // FIX: Add helper functions to convert G-Force values between API (milli-G) and UI (G).
    const getGForceValue = (path: string, defaultValueMilliG: number): number => {
        const milliG = getValue(path, defaultValueMilliG);
        // Use parseFloat and toFixed to handle potential floating point inaccuracies.
        return parseFloat(Math.abs(milliG / 1000).toFixed(2));
    };

    const handleGForceChange = (path: string, valueInG: number) => {
        let milliG = Math.round(valueInG * 1000);
        // Braking threshold is stored as a negative value in the API.
        if (path.includes('braking')) {
            milliG = -Math.abs(milliG);
        }
        onSettingChange(path, milliG);
    };

    // FIX: Update effect to find an exact preset match. If none, it's a custom setting.
    useEffect(() => {
        const currentBraking = getValue('events.harsh_braking_accel_threshold', null);
        const currentAccel = getValue('events.aggressive_accel_threshold', null);
        const currentCornering = getValue('events.harsh_cornering_accel_threshold', null);
        const currentImpact = getValue('events.possible_impact_accel_threshold', null);

        const matchingPresetIndex = vehicleCategoryPresets.findIndex(preset => 
            preset.values.harsh_braking_accel_threshold === currentBraking &&
            preset.values.aggressive_accel_threshold === currentAccel &&
            preset.values.harsh_cornering_accel_threshold === currentCornering &&
            preset.values.possible_impact_accel_threshold === currentImpact
        );

        if (matchingPresetIndex !== -1) {
            setVehicleCategory(matchingPresetIndex);
        } else {
            setVehicleCategory(null); // Indicates a custom configuration
        }
    }, [settings]);


    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value, 10);
        setVehicleCategory(index);
        const presetValues = vehicleCategoryPresets[index].values;
        
        // Apply all values from the selected preset.
        onSettingChange('events.harsh_braking_accel_threshold', presetValues.harsh_braking_accel_threshold);
        onSettingChange('events.aggressive_accel_threshold', presetValues.aggressive_accel_threshold);
        onSettingChange('events.harsh_cornering_accel_threshold', presetValues.harsh_cornering_accel_threshold);
        onSettingChange('events.possible_impact_accel_threshold', presetValues.possible_impact_accel_threshold);
    };

    const vehicleCategoryLabels = [
        t('settings.events.gForce.lightDuty'),
        t('settings.events.gForce.mediumDuty'),
        t('settings.events.gForce.heavyDuty'),
    ];

    return (
        <div>
            <Accordion title={t('settings.audio.title')}>
                <SettingsCheckbox label={t('settings.audio.notifications')} path="audio.audio_notifications_enabled" value={getValue('audio.audio_notifications_enabled')} onChange={onSettingChange} />
                <SettingsCheckbox label={t('settings.audio.streaming')} path="audio.streaming_audio_enabled" value={getValue('audio.streaming_audio_enabled')} onChange={onSettingChange} />
            </Accordion>

            <Accordion title={t('settings.camera.title')}>
                <h4 className="font-semibold text-md mb-2">{t('settings.camera.roadCamera')}</h4>
                <SettingsCheckbox label={t('settings.camera.audioRecording')} path="camera.road_camera.audio_recording" value={getValue('camera.road_camera.audio_recording')} onChange={onSettingChange} />
                <SettingsCheckbox label={t('settings.camera.cameraEnabled')} path="camera.road_camera.camera_enabled" value={getValue('camera.road_camera.camera_enabled')} onChange={onSettingChange} />
                <hr className="my-4 dark:border-gray-700"/>
                <h4 className="font-semibold text-md mb-2">{t('settings.camera.cabinCamera')}</h4>
                <SettingsCheckbox label={t('settings.camera.audioRecording')} path="camera.cabin_camera.audio_recording" value={getValue('camera.cabin_camera.audio_recording')} onChange={onSettingChange} />
                <SettingsCheckbox label={t('settings.camera.cameraEnabled')} path="camera.cabin_camera.camera_enabled" value={getValue('camera.cabin_camera.camera_enabled')} onChange={onSettingChange} />
                <hr className="my-4 dark:border-gray-700"/>
                <SettingsDropdown 
                    label={t('settings.camera.recordingProfile')}
                    path="camera.video_recording_profile" 
                    value={getValue('camera.video_recording_profile', 'standard')} 
                    onChange={onSettingChange} 
                    options={[
                        { value: 'standard', label: t('settings.camera.profiles.standard') },
                        { value: 'high', label: t('settings.camera.profiles.hd') },
                        { value: 'balanced', label: t('settings.camera.profiles.balanced') },
                        { value: 'extended', label: t('settings.camera.profiles.extended') },
                    ]} 
                />
            </Accordion>
            
            <Accordion title={t('settings.display.title')}>
                <SettingsSlider label={t('settings.display.brightness')} path="display.brightness" value={getValue('display.brightness', 50)} min={0} max={100} onChange={onSettingChange} />
                <SettingsDropdown label={t('settings.display.distanceUnit')} path="display.distance_unit" value={getValue('display.distance_unit', 'METRIC')} onChange={onSettingChange} options={[{value: 'METRIC', label: t('settings.display.units.metric')}, {value: 'IMPERIAL', label: t('settings.display.units.imperial')}]} />
                <SettingsDropdown label={t('settings.display.locale')} path="display.system_locale" value={getValue('display.system_locale', 'en-US')} onChange={onSettingChange} options={[{value: 'en-US', label: 'en-US'}, {value: 'en-CA', label: 'en-CA'}, {value: 'fr-CA', label: 'fr-CA'}, {value: 'es-MX', label: 'es-MX'}]} />
                <SettingsDropdown label={t('settings.display.timeStyle')} path="display.time_style" value={getValue('display.time_style', '12')} onChange={onSettingChange} options={[{value: '12', label: t('settings.display.timeStyles.12')}, {value: '24', label: t('settings.display.timeStyles.24')}]} />
            </Accordion>

            <Accordion title={t('settings.events.title')} startOpen>
                <Accordion title={t('settings.events.gForce.title')}>
                    <SettingsCheckbox label={t('settings.events.gForce.harshBraking')} path="events.harsh_braking_event_enabled" value={getValue('events.harsh_braking_event_enabled')} onChange={onSettingChange} />
                    <SettingsCheckbox label={t('settings.events.gForce.aggressiveAccel')} path="events.aggressive_accel_event_enabled" value={getValue('events.aggressive_accel_event_enabled')} onChange={onSettingChange} />
                    <SettingsCheckbox label={t('settings.events.gForce.harshCornering')} path="events.harsh_cornering_event_enabled" value={getValue('events.harsh_cornering_event_enabled')} onChange={onSettingChange} />
                    {/* FIX: Use correct API key 'possible_impact_event_enabled' */}
                    <SettingsCheckbox label={t('settings.events.gForce.possibleImpact')} path="events.possible_impact_event_enabled" value={getValue('events.possible_impact_event_enabled')} onChange={onSettingChange} />
                    <Accordion title={t('settings.events.gForce.thresholdsTitle')}>
                        {/* FIX: Replaced slider with radio buttons for better usability */}
                        <div className="py-2">
                            <label className="text-sm font-medium">{t('settings.events.gForce.vehicleTypePreset')}</label>
                            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:gap-6" role="radiogroup" aria-label={t('settings.events.gForce.vehicleTypePreset')}>
                                {vehicleCategoryLabels.map((label, index) => (
                                    <div key={index} className="flex items-center my-1 sm:my-0">
                                        <input
                                            id={`vehicle-type-${index}`}
                                            name="vehicle-type-preset"
                                            type="radio"
                                            value={index}
                                            checked={vehicleCategory === index}
                                            onChange={handleCategoryChange}
                                            className="h-4 w-4 text-raven-blue border-gray-300 focus:ring-raven-blue"
                                        />
                                        <label htmlFor={`vehicle-type-${index}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                            {label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <hr className="my-4 border-soft-grey dark:border-gray-600"/>
                        {/* FIX: Use correct API keys and value conversion helpers for all G-Force inputs */}
                        <SettingsNumberInput label={t('settings.events.gForce.brakingThreshold')} path="events.harsh_braking_accel_threshold" value={getGForceValue('events.harsh_braking_accel_threshold', -450)} onChange={(path, val) => handleGForceChange(path, val)} helpText={t('settings.events.gForce.gUnit')} step={0.01} />
                        <SettingsNumberInput label={t('settings.events.gForce.accelThreshold')} path="events.aggressive_accel_threshold" value={getGForceValue('events.aggressive_accel_threshold', 350)} onChange={(path, val) => handleGForceChange(path, val)} helpText={t('settings.events.gForce.gUnit')} step={0.01} />
                        <SettingsNumberInput label={t('settings.events.gForce.corneringThreshold')} path="events.harsh_cornering_accel_threshold" value={getGForceValue('events.harsh_cornering_accel_threshold', 400)} onChange={(path, val) => handleGForceChange(path, val)} helpText={t('settings.events.gForce.gUnit')} step={0.01} />
                        <SettingsNumberInput label={t('settings.events.gForce.impactThreshold')} path="events.possible_impact_accel_threshold" value={getGForceValue('events.possible_impact_accel_threshold', 1500)} onChange={(path, val) => handleGForceChange(path, val)} helpText={t('settings.events.gForce.gUnit')} step={0.1} />
                    </Accordion>
                </Accordion>
                <Accordion title={t('settings.events.standard.title')}>
                    <SettingsCheckbox label={t('settings.events.standard.idling')} path="events.idling_event_enabled" value={getValue('events.idling_event_enabled')} onChange={onSettingChange} />
                    <SettingsCheckbox label={t('settings.events.standard.speeding')} path="events.speeding_event_enabled" value={getValue('events.speeding_event_enabled')} onChange={onSettingChange} />
                    <SettingsNumberInput label={t('settings.events.standard.speedingThreshold')} path="events.speeding_event_threshold" value={getValue('events.speeding_event_threshold', 0)} onChange={onSettingChange} />
                    <SettingsDropdown label={t('settings.events.standard.speedingThresholdType')} path="events.speeding_event_threshold_type" value={getValue('events.speeding_event_threshold_type', 'PERCENT')} onChange={onSettingChange} options={[{value: 'PERCENT', label: t('settings.events.standard.types.percent')}, {value: 'CONSTANT', label: t('settings.events.standard.types.constant')}]} />
                </Accordion>
                 <Accordion title={t('settings.events.dms.title')}>
                    <SettingsCheckbox label={t('settings.events.dms.cellphone')} path="events.cellphone_detection_event_enabled" value={getValue('events.cellphone_detection_event_enabled')} onChange={onSettingChange} />
                    <SettingsCheckbox label={t('settings.events.dms.cameraObscured')} path="events.camera_obscured_event_enabled" value={getValue('events.camera_obscured_event_enabled')} onChange={onSettingChange} />
                    <SettingsCheckbox label={t('settings.events.dms.distraction')} path="events.distracted_detection_event_enabled" value={getValue('events.distracted_detection_event_enabled')} onChange={onSettingChange} />
                    <SettingsCheckbox label={t('settings.events.dms.drinking')} path="events.drinking_detection_event_enabled" value={getValue('events.drinking_detection_event_enabled')} onChange={onSettingChange} />
                    <SettingsCheckbox label={t('settings.events.dms.eating')} path="events.eating_detection_event_enabled" value={getValue('events.eating_detection_event_enabled')} onChange={onSettingChange} />
                    <SettingsCheckbox label={t('settings.events.dms.smoking')} path="events.smoking_detection_event_enabled" value={getValue('events.smoking_detection_event_enabled')} onChange={onSettingChange} />
                    <SettingsCheckbox label={t('settings.events.dms.fatigue')} path="events.tired_detection_event_enabled" value={getValue('events.tired_detection_event_enabled')} onChange={onSettingChange} />
                </Accordion>
                 <Accordion title={t('settings.events.adas.title')}>
                    <SettingsCheckbox label={t('settings.events.adas.tailgating')} path="events.tailgating_detection_event_enabled" value={getValue('events.tailgating_detection_event_enabled')} onChange={onSettingChange} />
                    <SettingsNumberInput label={t('settings.events.adas.tailgatingThreshold')} helpText="km/h" path="events.tailgating_detection_speed_threshold" value={getValue('events.tailgating_detection_speed_threshold', 0)} onChange={onSettingChange} />
                </Accordion>
            </Accordion>
            
            <Accordion title={t('settings.obd.title')}>
                <SettingsCheckbox label={t('settings.obd.canbus')} path="obd.canbus_enabled" value={getValue('obd.canbus_enabled')} onChange={onSettingChange} />
                <SettingsNumberInput label={t('settings.obd.lowBatteryCutoff')} helpText="mV" path="obd.low_battery_cutoff_millivolts" value={getValue('obd.low_battery_cutoff_millivolts', 12000)} onChange={onSettingChange} />
            </Accordion>

            <Accordion title={t('settings.system.title')}>
                <SettingsCheckbox label={t('settings.system.gesture')} path="system.gesture_enabled" value={getValue('system.gesture_enabled')} onChange={onSettingChange} />
                <SettingsNumberInput label={t('settings.system.videoAfterParked')} helpText={t('common.seconds')} path="system.video_recording_after_parked_duration" value={getValue('system.video_recording_after_parked_duration', 30)} onChange={onSettingChange} />
            </Accordion>

        </div>
    );
};
