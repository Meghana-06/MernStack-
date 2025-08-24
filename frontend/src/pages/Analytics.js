import React from 'react';
import { useParams } from 'react-router-dom';

const Analytics = () => {
  const { id } = useParams();
  const isEventSpecific = !!id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEventSpecific ? 'Event Analytics' : 'Analytics Dashboard'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isEventSpecific ? `Analytics for event ID: ${id}` : 'Comprehensive analytics and insights'}
        </p>
      </div>
      
      <div className="card">
        <p className="text-gray-600 dark:text-gray-400">
          Analytics page - Implementation coming soon!
        </p>
      </div>
    </div>
  );
};

export default Analytics;