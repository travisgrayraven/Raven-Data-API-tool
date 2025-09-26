
import React, { useRef } from 'react';
import type { RavenDetails } from '../types';
import { useTranslation } from '../i18n/i18n';

interface RavenCardProps {
  raven: RavenDetails;
  onSelect: () => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onStartSelectionMode: (uuid: string) => void;
  onToggleSelection: (uuid: string) => void;
}

export const RavenCard: React.FC<RavenCardProps> = ({ raven, onSelect, isSelectionMode, isSelected, onStartSelectionMode, onToggleSelection }) => {
    const { t } = useTranslation();
    const pressTimer = useRef<number | null>(null);
    const longPressed = useRef(false);

    // Time formatting helper
    const formatTimeAgo = (isoString: string | undefined): string | null => {
        if (!isoString) return null;
        const date = new Date(isoString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return t('time.justNow');

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return t('time.minutesAgo', { count: minutes });
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t('time.hoursAgo', { count: hours });

        const days = Math.floor(hours / 24);
        if (days < 30) return t('time.daysAgo', { count: days });
        
        const months = Math.floor(days / 30);
        if (months < 12) return t('time.monthsAgo', { count: months });

        const years = Math.floor(days / 365);
        return t('time.yearsAgo', { count: years });
    };
    
    const handlePressStart = () => {
        longPressed.current = false;
        pressTimer.current = window.setTimeout(() => {
            longPressed.current = true;
            onStartSelectionMode(raven.uuid);
        }, 500); // 500ms for long press
    };

    const handlePressEnd = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    const handleClick = () => {
        if (longPressed.current) {
            return;
        }
        if (isSelectionMode) {
            onToggleSelection(raven.uuid);
        } else {
            onSelect();
        }
    };

    const { make, model, year } = raven.vehicle_info || {};
    
    const title = raven.name || t('ravenCard.unnamedVehicle');
    const subTitle = (make && model && year) ? `${year} ${make} ${model}` : raven.serial_number;

    const odometer = raven.last_known_obd_snapshot?.odometer_km;
    const fuel = raven.last_known_obd_snapshot?.fuel_level_percentage;

    const lastReportTime = raven.last_known_location?.timestamp;
    const formattedLastReport = formatTimeAgo(lastReportTime);

    // Vehicle Status Logic
    // FIX: Changed JSX.Element to React.ReactNode to resolve namespace error.
    let statusText: string, statusIcon: React.ReactNode, statusColor: string, statusTitle: string;

    if (raven.unplugged) {
        statusText = t('ravenCard.status.unplugged');
        statusColor = 'text-safety-orange dark:text-safety-orange';
        statusIcon = (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
        );
        statusTitle = t('ravenCard.statusTitle.unplugged');
    } else if (!raven.online) {
        statusText = t('ravenCard.status.offline');
        statusColor = 'text-charcoal-grey dark:text-light-grey';
        statusIcon = (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
        );
        statusTitle = t('ravenCard.statusTitle.offline');
    } else if (raven.engineOn) {
        statusText = t('ravenCard.status.driving');
        statusColor = 'text-green-600 dark:text-green-400';
        statusIcon = (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h2a1 1 0 001-1V7a1 1 0 00-1-1h-2" /></svg>
        );
        statusTitle = t('ravenCard.statusTitle.driving', { time: formattedLastReport });
    } else { // Parked
        statusText = t('ravenCard.status.parked');
        statusColor = 'text-raven-blue dark:text-sky-blue';
        statusIcon = (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 10h1.5a2.5 2.5 0 110 5H10v-5z" /></svg>
        );
        statusTitle = t('ravenCard.statusTitle.parked', { time: formattedLastReport });
    }

    // Fuel Gauge Color Logic
    let fuelColorClass = 'bg-green-600 dark:bg-green-500';
    if (fuel !== undefined) {
        if (fuel < 10) {
            fuelColorClass = 'bg-alert-red dark:bg-alert-red';
        } else if (fuel < 20) {
            fuelColorClass = 'bg-safety-orange dark:bg-safety-orange';
        }
    }


    return (
        <div
            onClick={handleClick}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            className={`relative bg-white dark:bg-gray-800 rounded-lg p-5 cursor-pointer transform hover:scale-105 transition-transform duration-200 flex flex-col group h-full border-2 ${isSelected ? 'border-raven-blue dark:border-sky-blue' : 'border-transparent'}`}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleClick()}
            aria-label={t('ravenCard.viewDetails', { vehicleName: title })}
            aria-checked={isSelectionMode ? isSelected : undefined}
        >
             <div className={`absolute top-3 left-3 h-6 w-6 rounded-full flex items-center justify-center transition-all duration-200 z-10 ${isSelectionMode ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                {isSelected ? (
                    <div className="h-full w-full rounded-full bg-raven-blue border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-md">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                ) : (
                    <div className="h-full w-full rounded-full bg-white/70 dark:bg-gray-600/70 backdrop-blur-sm border-2 border-gray-400 dark:border-gray-500 shadow"></div>
                )}
            </div>
            {/* Card Header */}
            <div className="flex justify-between items-start">
                <div className="flex-grow pl-8">
                    <h3 className="text-lg font-bold truncate pr-2 text-gray-900 dark:text-white" title={title}>
                        {title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-soft-grey truncate pr-2" title={subTitle}>
                        {subTitle}
                    </p>
                </div>
                <div className="flex-shrink-0 mt-1" title={statusTitle}>
                    <div className={`flex items-center gap-1.5 ${statusColor}`}>
                        {statusIcon}
                        <span className="text-xs font-semibold">{statusText}</span>
                    </div>
                </div>
            </div>

            {/* Last Report Time */}
            {formattedLastReport && (
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 pl-8" title={t('ravenCard.lastReportTitle', { time: new Date(lastReportTime!).toLocaleString() })}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>{t('ravenCard.lastReport', { time: formattedLastReport })}</span>
                </div>
            )}

            {/* OBD Data Section */}
            <div className="my-4 space-y-3 text-sm text-gray-700 dark:text-gray-200 flex-grow">
                {odometer !== undefined ? (
                    <div className="flex items-center gap-2" title={t('ravenCard.odometerTitle', { value: Math.round(odometer).toLocaleString() })}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-mono">{Math.round(odometer).toLocaleString()} km</span>
                    </div>
                ) : <div className="h-5" />}
                
                {fuel !== undefined ? (
                    <div className="flex items-center gap-2" title={t('ravenCard.fuelTitle', { value: Math.round(fuel) })}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 ml-1">
                            <div className={`${fuelColorClass} h-2.5 rounded-full`} style={{ width: `${fuel}%` }}></div>
                        </div>
                        <span className="font-mono w-10 text-right">{Math.round(fuel)}%</span>
                    </div>
                ) : <div className="h-5" />}
            </div>
        </div>
    );
};