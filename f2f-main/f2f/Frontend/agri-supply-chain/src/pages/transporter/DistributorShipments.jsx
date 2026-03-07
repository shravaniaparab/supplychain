import TransporterShipmentsList from './TransporterShipmentsList';

const DistributorShipments = () => {
  return (
    <TransporterShipmentsList
      title="Distributor Shipments"
      filterFn={(request) => request.from_party_details?.role === 'distributor'}
      emptyMessage="No distributor shipments found"
    />
  );
};

export default DistributorShipments;
