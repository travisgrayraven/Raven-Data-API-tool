
import React from 'react';
import type { RavenDetails } from '../types';

interface VehicleTableProps {
  ravens: RavenDetails[];
}

export const VehicleTable: React.FC<VehicleTableProps> = ({ ravens }) => {
  return (
    <div className="mt-8 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <h2 className="text-xl font-semibold text-white p-4 bg-gray-900/50">Raven Vehicle Details</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IMEI</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">UUID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Known Location</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {ravens.map((raven) => (
              <tr key={raven.uuid} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{raven.name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{raven.imei}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">{raven.uuid}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {raven.last_known_location
                    ? `${raven.last_known_location.latitude.toFixed(4)}, ${raven.last_known_location.longitude.toFixed(4)}`
                    : 'Not available'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
