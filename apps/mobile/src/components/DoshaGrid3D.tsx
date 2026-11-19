import React from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { Colors } from "../theme/colors";

interface DoshaGrid3DProps {
  data: any;
  isLoading?: boolean;
}

export const DoshaGrid3D: React.FC<DoshaGrid3DProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 3D-like styling with shadows */}
      <View style={styles.doshaCard}>
        <Text style={styles.doshaName}>Manglik</Text>
        <Text
          style={[
            styles.doshaStatus,
            { color: data?.manglik?.has_dosha ? Colors.error : Colors.success },
          ]}
        >
          {data?.manglik?.has_dosha ? "Dosha Present" : "No Dosha"}
        </Text>
      </View>
      <View style={styles.doshaCard}>
        <Text style={styles.doshaName}>Kaal Sarp</Text>
        <Text
          style={[
            styles.doshaStatus,
            {
              color: data?.kaal_sarp?.has_dosha ? Colors.error : Colors.success,
            },
          ]}
        >
          {data?.kaal_sarp?.has_dosha ? "Active" : "Not Present"}
        </Text>
      </View>
      <View style={styles.doshaCard}>
        <Text style={styles.doshaName}>Sade Sati</Text>
        <Text
          style={[
            styles.doshaStatus,
            {
              color: data?.sade_sati?.is_active
                ? Colors.warning
                : Colors.success,
            },
          ]}
        >
          {data?.sade_sati?.phase || "None"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    padding: 4,
  },
  doshaCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // 3D-like elevation
  },
  doshaName: {
    color: Colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  doshaStatus: {
    fontSize: 12,
    fontWeight: "bold",
  },
});
