import React from 'react';
import { useParams } from 'react-router-dom';

const EventDetails = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event Details</h1>
        <p className="text-gray-600 dark:text-gray-400">Event ID: {id}</p>
      </div>
      
      <div className="card">
        <p className="text-gray-600 dark:text-gray-400">
          Event details page - Implementation coming soon!
        </p>
      </div>
    </div>
  );
};

export default EventDetails;