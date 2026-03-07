import TransporterShipmentsList from './TransporterShipmentsList';

const FarmerShipments = () => {
  return (
    <TransporterShipmentsList
      title="Farmer Shipments"
      filterFn={(request) => request.from_party_details?.role === 'farmer'}
      emptyMessage="No farmer shipments found"
    />
  );
};

export default FarmerShipments;
