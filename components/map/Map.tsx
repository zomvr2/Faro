import {
    getReportImageUrls,
    type ReportDocument,
} from '@/services/appwrite';
import { ReportMarker } from '@/features/map/components/ReportMarker';
import { ReportZoneMarker } from '@/features/map/components/ReportZoneMarker';
import { IntroLogoOverlay } from '@/features/map/components/IntroLogoOverlay';
import { ReportGalleryModal } from '@/features/map/components/ReportGalleryModal';
import { ReportDetailsSheet } from '@/features/map/components/ReportDetailsSheet';
import { UserLocationPuckLayer } from '@/features/map/components/UserLocationPuckLayer';
import {
    getReportZoneCounters,
    type ReportZoneCounter,
} from '@/features/map/utils/reportZones';
import { useMapReports } from '@/features/map/hooks/useMapReports';
import { useReportFocusParams } from '@/features/map/hooks/useReportFocusParams';
import { useMapCameraController } from '@/features/map/hooks/useMapCameraController';
import {
    getReportMarkerStyle,
    getReportStatusStyle,
} from '@/features/map/constants/reportStyles';
import {
    OVERVIEW_ZOOM_LEVEL,
    RECENTER_FLY_DURATION_MS,
    REPORT_MARKERS_MIN_ZOOM_LEVEL,
    REPORT_ZONE_FOCUS_ZOOM_LEVEL,
    USER_PITCH,
    USER_ZOOM_LEVEL,
} from '@/features/map/constants/camera';
import { formatDistance, getLngLatDistanceMeters } from '@/shared/geo/distance';
import {
    getReportLocationLabel,
    getReportRating,
    isReportPossiblyFalse,
} from '@/shared/reports/reportSelectors';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
    Camera,
    Map as MapLibreMap,
} from '@maplibre/maplibre-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    StyleSheet,
    View,
} from 'react-native';
import {
    MAX_NAVIGATION_ZOOM_LEVEL,
    MIN_NAVIGATION_ZOOM_LEVEL,
    SERVICE_AREA_BOUNDS,
    SERVICE_AREA_CENTER,
    isCoordinatesInServiceArea,
} from './serviceArea';

const OVERVIEW_COORDINATE: GeoJSON.Position = SERVICE_AREA_CENTER;

export default function Map() {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const {
    cameraRef,
    currentZoom,
    flyToCoordinate,
    followUserLocation,
    handleRegionDidChange,
    handleRegionWillChange,
    handleTrackUserLocationChange,
    introLogoOpacity,
    queueCameraTimer,
    setFollowUserLocationMode,
    setIsCenteredOnUser,
    showIntroLogo,
    userCoordinate,
  } = useMapCameraController();
  const {
    isSelectedReportVoting,
    reports,
    selectedReport,
    selectReport,
    voteSelectedReport,
  } = useMapReports();
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const visibleReports = useMemo(() => reports.filter((report) =>
    Number.isFinite(report.lat) &&
    Number.isFinite(report.lng) &&
    isCoordinatesInServiceArea({ lat: report.lat, lng: report.lng })
  ), [reports]);
  const shouldShowReportMarkers = currentZoom >= REPORT_MARKERS_MIN_ZOOM_LEVEL;
  const reportZoneCounters = useMemo(() => getReportZoneCounters(visibleReports), [visibleReports]);

  const closeReportModal = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const openReportModal = useCallback((report: ReportDocument) => {
    selectReport(report);
    requestAnimationFrame(() => {
      bottomSheetRef.current?.present();
    });
  }, [selectReport]);

  const focusReportZone = useCallback((zoneCounter: ReportZoneCounter) => {
    flyToCoordinate(zoneCounter.coordinate, {
      zoom: REPORT_ZONE_FOCUS_ZOOM_LEVEL,
      pitch: USER_PITCH,
      duration: RECENTER_FLY_DURATION_MS,
    });
  }, [flyToCoordinate]);

  useReportFocusParams({
    cameraRef,
    focusDuration: RECENTER_FLY_DURATION_MS,
    focusPitch: USER_PITCH,
    focusZoom: USER_ZOOM_LEVEL,
    onOpenReport: openReportModal,
    queueTimer: queueCameraTimer,
    reports,
    setFollowUserLocationMode,
    setIsCenteredOnUser,
  });

  const handleBottomSheetChange = useCallback((index: number) => {
    if (index === -1) {
      selectReport(null);
      setIsGalleryVisible(false);
      setSelectedImageIndex(0);
    }
  }, [selectReport]);

  const selectedReportDistance = selectedReport && userCoordinate
    ? formatDistance(getLngLatDistanceMeters(userCoordinate, [selectedReport.lng, selectedReport.lat]))
    : 'No disponible';

  const selectedReportLocationLabel = selectedReport ? getReportLocationLabel(selectedReport) : 'Ubicacion no disponible';
  const selectedReportRating = selectedReport ? getReportRating(selectedReport) : 0;
  const selectedReportIsPossiblyFalse = selectedReport ? isReportPossiblyFalse(selectedReport) : false;
  const selectedReportImages = selectedReport ? getReportImageUrls(selectedReport) : [];

  const selectedMarkerStyle = selectedReport ? getReportMarkerStyle(selectedReport.category) : null;

  const selectedStatusStyle = selectedReport ? getReportStatusStyle(selectedReport.status) : null;

  const openGalleryAtIndex = useCallback((index: number) => {
    if (selectedReportImages.length === 0) {
      return;
    }

    const safeIndex = Math.max(0, Math.min(index, selectedReportImages.length - 1));
    setSelectedImageIndex(safeIndex);
    setIsGalleryVisible(true);
  }, [selectedReportImages.length]);

  const closeGallery = useCallback(() => {
    setIsGalleryVisible(false);
  }, []);

  return (
    <View style={styles.container}>
      <MapLibreMap
        androidView='texture'
        attribution={false}
        compass={false}
        logo={false}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onRegionDidChange={handleRegionDidChange}
        onRegionWillChange={handleRegionWillChange}
        style={styles.map}
        tintColor="#1eaae1"
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: OVERVIEW_COORDINATE as [number, number],
            zoom: OVERVIEW_ZOOM_LEVEL,
          }}
          maxBounds={SERVICE_AREA_BOUNDS}
          maxZoom={MAX_NAVIGATION_ZOOM_LEVEL}
          minZoom={MIN_NAVIGATION_ZOOM_LEVEL}
          onTrackUserLocationChange={handleTrackUserLocationChange}
          pitch={followUserLocation ? USER_PITCH : undefined}
          trackUserLocation={followUserLocation ? 'course' : undefined}
          zoom={followUserLocation ? USER_ZOOM_LEVEL : undefined}
        />

        {userCoordinate ? <UserLocationPuckLayer coordinate={userCoordinate} /> : null}

        {shouldShowReportMarkers ? visibleReports.map((report) => {
          const markerStyle = getReportMarkerStyle(report.category);

          return (
            <ReportMarker
              key={report.$id}
              report={report}
              markerStyle={markerStyle}
              isPossiblyFalse={isReportPossiblyFalse(report)}
              onPress={openReportModal}
            />
          );
        }) : reportZoneCounters.map((zoneCounter) => (
          <ReportZoneMarker
            key={zoneCounter.id}
            zoneCounter={zoneCounter}
            onPress={focusReportZone}
          />
        ))}
      </MapLibreMap>

      <ReportDetailsSheet
        sheetRef={bottomSheetRef}
        report={selectedReport}
        markerStyle={selectedMarkerStyle}
        statusStyle={selectedStatusStyle}
        imageUrls={selectedReportImages}
        distanceLabel={selectedReportDistance}
        locationLabel={selectedReportLocationLabel}
        rating={selectedReportRating}
        isPossiblyFalse={selectedReportIsPossiblyFalse}
        isVoting={isSelectedReportVoting}
        onChange={handleBottomSheetChange}
        onClose={closeReportModal}
        onOpenGalleryAtIndex={openGalleryAtIndex}
        onVote={(vote) => {
          void voteSelectedReport(vote);
        }}
      />
      <ReportGalleryModal
        visible={isGalleryVisible}
        imageUrls={selectedReportImages}
        selectedIndex={selectedImageIndex}
        onClose={closeGallery}
        onSelectedIndexChange={setSelectedImageIndex}
      />

      {showIntroLogo ? <IntroLogoOverlay opacity={introLogoOpacity} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
