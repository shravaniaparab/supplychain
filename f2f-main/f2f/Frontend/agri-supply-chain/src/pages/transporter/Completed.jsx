import TransporterShipmentsList from './TransporterShipmentsList';

const Completed = () => {
  return (
    <TransporterShipmentsList
      title="Completed Deliveries"
      filterFn={(request) => request.status === 'DELIVERED'}
      emptyMessage="No completed deliveries yet"
      showActions={false}
    />
  );
};

export default Completed;
