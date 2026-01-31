import RoomTotalsDisplay from './RoomTotalsDisplay';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Room Totals Display',
  description: 'Live room occupancy for public display',
};

export default function DisplayPage() {
  return <RoomTotalsDisplay />;
}
