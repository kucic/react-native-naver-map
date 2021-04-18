import React, {
    memo,
    useState,
    useEffect,
    useMemo,
    useRef,
    forwardRef,
} from "react";
import {Dimensions, LayoutAnimation, Platform} from "react-native";
import NaverMapView, {Marker, Polyline} from "./map"
import SuperCluster from "supercluster";
import ClusterMarker from "./ClusteredMarker";
import {
    calDelta,
    convertBBox,
    isMarker,
    markerToGeoJSONFeature,
    calculateBBox,
    returnMapZoom,
    generateSpiral,
} from "./helper";

const ClusteredMapView = forwardRef(
    (
        {
            radius,
            maxZoom,
            minZoom,
            minPoints,
            extent,
            nodeSize,
            children,
            onClusterPress,
            onCameraChange,
            onMarkersChange,
            preserveClusterPressBehavior,
            clusteringEnabled,
            clusterColor,
            clusterTextColor,
            clusterFontFamily,
            spiderLineColor,
            layoutAnimationConf,
            animationEnabled,
            renderCluster,
            spiralEnabled,
            superClusterRef,
            ...restProps
        },
        ref
    ) => {
        const [markers, updateMarkers] = useState([]);
        const [spiderMarkers, updateSpiderMarker] = useState([]);
        const [otherChildren, updateChildren] = useState([]);
        const [superCluster, setSuperCluster] = useState(null);
        const [currentRegion, updateRegion] = useState(
            {latitude: restProps.center.latitude, longitude: restProps.center.longitude, zoom: restProps.center.zoom}
        );

        const [isSpiderfier, updateSpiderfier] = useState(false);
        const [clusterChildren, updateClusterChildren] = useState(null);
        const mapRef = useRef();

        const propsChildren = useMemo(() => React.Children.toArray(children), [
            children,
        ]);

        useEffect(() => {
            const rawData = [];
            const otherChildren = [];

            if (!clusteringEnabled) {
                updateSpiderMarker([]);
                updateMarkers([]);
                updateChildren(propsChildren);
                setSuperCluster(null);
                return;
            }

            propsChildren.forEach((child, index) => {
                if (isMarker(child)) {
                    rawData.push(markerToGeoJSONFeature(child, index));
                } else {
                    otherChildren.push(child);
                }
            });

            const superCluster = new SuperCluster({
                radius,
                maxZoom,
                minZoom,
                minPoints,
                extent,
                nodeSize,
            });

            superCluster.load(rawData);

            //const bBox = convertBBox(currentRegion.latitude, currentRegion.longitude, currentRegion.zoom);
            //const zoom = currentRegion.zoom;
            const region = calDelta(currentRegion.latitude, currentRegion.longitude, currentRegion.zoom)
            const bBox = calculateBBox(region);
            const zoom = returnMapZoom(region, bBox, minZoom);
            const markers = superCluster.getClusters(bBox, zoom);

            updateMarkers(markers);
            updateChildren(otherChildren);
            setSuperCluster(superCluster);

            superClusterRef.current = superCluster;
        }, [propsChildren, clusteringEnabled]);

        useEffect(() => {
            if (!spiralEnabled) return;

            if (isSpiderfier && markers.length > 0) {
                let allSpiderMarkers = [];
                let spiralChildren = [];
                markers.map((marker, i) => {
                    if (marker.properties.cluster) {
                        spiralChildren = superCluster.getLeaves(
                            marker.properties.cluster_id,
                            Infinity
                        );
                    }
                    let positions = generateSpiral(marker, spiralChildren, markers, i);
                    allSpiderMarkers.push(...positions);
                });

                updateSpiderMarker(allSpiderMarkers);
            } else {
                updateSpiderMarker([]);
            }
        }, [isSpiderfier, markers]);

        const _onCameraChange = (event) => {
            if (superCluster && event) {
                // latitude, longitude, zoom 으로 region 을 만들어야함 ㅡ.ㅡ;;
                //const bBox = convertBBox(event.latitude, event.longitude, event.zoom);
                const region = calDelta(event.latitude, event.longitude, event.zoom)
                const bBox = calculateBBox(region);
                const zoom = returnMapZoom(region, bBox, minZoom);
                //const zoom = event.zoom;
                const markers = superCluster.getClusters(bBox, zoom);
                if (animationEnabled && Platform.OS === "ios") {
                    LayoutAnimation.configureNext(layoutAnimationConf);
                }
                if (zoom >= 18 && markers.length > 0 && clusterChildren) {
                    if (spiralEnabled) updateSpiderfier(true);
                } else {
                    if (spiralEnabled) updateSpiderfier(false);
                }
                updateMarkers(markers);
                onMarkersChange(markers);
                onCameraChange(event, markers);
                updateRegion(event);
            } else {
                onCameraChange(event);
            }
        };

        const _onClusterPress = (cluster) => () => {
            const children = superCluster.getLeaves(cluster.id, Infinity);
            updateClusterChildren(children);

            if (preserveClusterPressBehavior) {
                onClusterPress(cluster, children);
                return;
            }

            const coordinates = children.map(({geometry}) => ({
                latitude: geometry.coordinates[1],
                longitude: geometry.coordinates[0],
            }));

            mapRef.current.animateToCoordinates(coordinates);
            onClusterPress(cluster, children);
        };

        return (
            <NaverMapView
                {...restProps}
                ref={(map) => {
                    mapRef.current = map;
                    if (ref) ref.current = map;
                    restProps.mapRef(map);
                }}
                onCameraChange={_onCameraChange}
            >
                {
                    markers.map( (marker)=>
                        marker.properties.point_count === 0 ?
                            (
                                propsChildren[marker.properties.index]
                            )
                            :
                            renderCluster ? (
                                renderCluster({
                                    onPress: _onClusterPress(marker),
                                    clusterColor,
                                    clusterTextColor,
                                    clusterFontFamily,
                                    ...marker,
                                })
                            ) : (
                                <ClusterMarker
                                    key={`cluster-${marker.id}`}
                                    {...marker}
                                    onClick={_onClusterPress(marker)}
                                    clusterColor={
                                        restProps.selectedClusterId === marker.id
                                            ? restProps.selectedClusterColor
                                            : clusterColor
                                    }
                                    clusterTextColor={clusterTextColor}
                                    clusterFontFamily={clusterFontFamily}
                                />
                            )
                    )
                    /*
                    markers.map((marker) =>
                        marker.properties.point_count === 0 ? (
                            propsChildren[marker.properties.index]
                        ) : !isSpiderfier ? (
                            renderCluster ? (
                                renderCluster({
                                    onPress: _onClusterPress(marker),
                                    clusterColor,
                                    clusterTextColor,
                                    clusterFontFamily,
                                    ...marker,
                                })
                            ) : (
                                <ClusterMarker
                                    key={`cluster-${marker.id}`}
                                    {...marker}
                                    onClick={_onClusterPress(marker)}
                                    clusterColor={
                                        restProps.selectedClusterId === marker.id
                                            ? restProps.selectedClusterColor
                                            : clusterColor
                                    }
                                    clusterTextColor={clusterTextColor}
                                    clusterFontFamily={clusterFontFamily}
                                />
                            )
                        ) : null
                    )
                     */
                }
                {otherChildren}
                {spiderMarkers.map((marker) => {
                    return propsChildren[marker.index]
                        ? React.cloneElement(propsChildren[marker.index], {
                            coordinate: {...marker},
                        })
                        : null;
                })}
                {spiderMarkers.map((marker, index) => (
                    <Polyline
                        key={index}
                        coordinates={[marker.centerPoint, marker, marker.centerPoint]}
                        strokeColor={spiderLineColor}
                        strokeWidth={1}
                    />
                ))}
            </NaverMapView>
        );
    }
);

ClusteredMapView.defaultProps = {
    clusteringEnabled: true,
    spiralEnabled: true,
    animationEnabled: true,
    preserveClusterPressBehavior: false,
    layoutAnimationConf: LayoutAnimation.Presets.spring,
    // SuperCluster parameters
    radius: Dimensions.get("window").width * 0.06,
    maxZoom: 20,
    minZoom: 1,
    minPoints: 2,
    extent: 512,
    nodeSize: 64,
    // Map parameters
    edgePadding: {top: 50, left: 50, right: 50, bottom: 50},
    // Cluster styles
    clusterColor: "#00B386",
    clusterTextColor: "#FFFFFF",
    spiderLineColor: "#FF0000",
    // Callbacks
    onCameraChange: (e) => {
    },
    onClusterPress: () => {
    },
    onMarkersChange: () => {
    },
    superClusterRef: {},
    mapRef: () => {
    },
};

export default memo(ClusteredMapView);
