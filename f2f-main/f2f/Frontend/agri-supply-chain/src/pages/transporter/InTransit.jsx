import TransporterShipmentsList from './TransporterShipmentsList';

const InTransit = () => {
  const inTransitStatuses = ['ACCEPTED', 'IN_TRANSIT', 'IN_TRANSIT_TO_RETAILER', 'ARRIVED', 'ARRIVAL_CONFIRMED'];
  
  return (
    <TransporterShipmentsList
      title="In Transit Shipments"
      filterFn={(request) => inTransitStatuses.includes(request.status)}
      emptyMessage="No shipments currently in transit"
    />
  );
};

export default InTransit;
