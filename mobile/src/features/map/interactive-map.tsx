import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { openCompanyDetails } from '@/features/company/open-company';
import type { InteractiveMapProps } from './interactive-map.types';

const FALLBACK_REGION = {
  latitude: -3.7319,
  longitude: -38.5267,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export function InteractiveMap({ companies }: InteractiveMapProps) {
  const firstCompany = companies[0];
  const initialRegion = firstCompany
    ? {
        latitude: firstCompany.latitude,
        longitude: firstCompany.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : FALLBACK_REGION;

  return (
    <MapView style={styles.map} initialRegion={initialRegion}>
      {companies.map((company) => (
        <Marker
          key={company._id}
          coordinate={{ latitude: company.latitude, longitude: company.longitude }}
          title={company.name}
          description={company.address ?? undefined}
          onPress={() => openCompanyDetails(company._id)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
