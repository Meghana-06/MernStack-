import React from 'react';
import { useParams } from 'react-router-dom';

const EventForm = () => {
  const { id } = useParams();
  const isEditing = !!id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Event' : 'Create New Event'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isEditing ? `Editing event ID: ${id}` : 'Fill in the details to create your event'}
        </p>
      </div>
      
      <div className="card">
        <p className="text-gray-600 dark:text-gray-400">
          Event form - Implementation coming soon!
        </p>
      </div>
    </div>
  );
};

export default EventForm;