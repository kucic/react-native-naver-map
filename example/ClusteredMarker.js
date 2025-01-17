import React, { memo } from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import {Align, Marker} from "./map"
import { returnMarkerStyle } from "./helper";

const icon_clustering = require("./assets/clusteringMarker_128.png");

const ClusteredMarker = ({
                             geometry,
                             properties,
                             onClick,
                             clusterColor,
                             clusterTextColor,
                             clusterFontFamily,
                         }) => {
    const points = properties.point_count;
    const { width, height, fontSize, size } = returnMarkerStyle(points);

    return (
        <Marker
            key={`${geometry.coordinates[0]}_${geometry.coordinates[1]}`}
            coordinate={{
                longitude: geometry.coordinates[0],
                latitude: geometry.coordinates[1],
            }}
            zIndex={points + 1}
            onClick={onClick}
            width={width}
            height={height}
            image={icon_clustering}
            caption={{text:points.toString(), align: Align.Center, color: clusterTextColor, textSize:fontSize, haloColor:"rgba(0,0,0,0.4)"}}
        >
            {
                /*
                <TouchableOpacity
                activeOpacity={0.5}
                style={[styles.container, { width, height }]}
            >
                <View
                    style={[
                        styles.wrapper,
                        {
                            backgroundColor: clusterColor,
                            width,
                            height,
                            borderRadius: width / 2,
                        },
                    ]}
                />
                <View
                    style={[
                        styles.cluster,
                        {
                            backgroundColor: clusterColor,
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.text,
                            {
                                color: clusterTextColor,
                                fontSize,
                                fontFamily: clusterFontFamily,
                            },
                        ]}
                    >
                        {points}
                    </Text>
                </View>
            </TouchableOpacity>
                 */
            }

        </Marker>
    );
};

const styles = StyleSheet.create({
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    wrapper: {
        position: "absolute",
        opacity: 0.5,
        zIndex: 0,
    },
    cluster: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    text: {
        fontWeight: "bold",
    },
});

export default memo(ClusteredMarker);
