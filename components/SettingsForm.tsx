
import React, { useState } from 'react';
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

const SettingsNumberInput: React.FC<ControlProps> = ({ label, path, value, onChange, helpText }) => (
     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-2">
        <label htmlFor={path} className="text-sm font-medium">{label} {helpText && <span className="text-xs text-gray-500">({helpText})</span>}</label>
        <input
            id={path}
            type="number"
            value={value || 0}
            onChange={(e) => onChange(path, parseInt(e.target.value, 10))}
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

export const SettingsForm: React.FC<SettingsFormProps> = ({ settings, onSettingChange }) => {
    const { t } = useTranslation();
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