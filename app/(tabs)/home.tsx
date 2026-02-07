import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borders, progressBar } from '../../constants/theme';

export default function HomeScreen() {
  const progressPercentage = 67;
  const currentUnit = {
    title: 'Daily Routines',
    number: 3,
    total: 12,
    progress: 65,
  };

  const practiceItems = [
    'Text langcat for a referral',
    'Talk to langcat for reserving seats at a restaurant',
    'Listen to langcat to discern its meaning',
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>MANADARIN · HSK 1</Text>
          <Text style={styles.headerTitle}>Progress</Text>
        </View>

        {/* Main Progress */}
        <View style={styles.mainProgressSection}>
          <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
          <Text style={styles.progressLabel}>HSK 1</Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
              />
            </View>
          </View>
        </View>

        {/* Current Unit */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CURRENT UNIT</Text>
          <TouchableOpacity style={styles.unitCard} activeOpacity={0.8}>
            <View style={styles.unitContent}>
              <Text style={styles.unitTitle}>{currentUnit.title}</Text>
              <Text style={styles.unitSubtitle}>
                UNIT {currentUnit.number} of {currentUnit.total}
              </Text>
              <View style={styles.unitProgressContainer}>
                <View style={styles.unitProgressBar}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.unitProgressFill, { width: `${currentUnit.progress}%` }]}
                  />
                </View>
                <Text style={styles.unitProgressText}>{currentUnit.progress}%</Text>
              </View>
            </View>
            <View style={styles.arrowIcon}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Practice by Immersion */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRACTICE BY IMMERSION</Text>
          <View style={styles.practiceContainer}>
            {practiceItems.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.practiceItem,
                  index < practiceItems.length - 1 && styles.practiceItemWithBorder
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.practiceItemText}>{item}</Text>
                <View style={styles.arrowIcon}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Test Yourself */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TEST YOURSELF</Text>
          <View style={styles.practiceContainer}>
            <TouchableOpacity style={styles.practiceItem} activeOpacity={0.8}>
              <Text style={styles.practiceItemText}>Assignment 1</Text>
              <View style={styles.arrowIcon}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Review Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REVIEW YOUR NOTES</Text>
          <View style={styles.practiceContainer}>
            <TouchableOpacity style={styles.practiceItem} activeOpacity={0.8}>
              <Text style={styles.practiceItemText}>People and Places</Text>
              <View style={styles.arrowIcon}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  headerSubtitle: {
    ...typography.headerSmall,
    color: colors.text,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 38,
    fontFamily: 'ArchivoBlack_400Regular',  // Archivo Black font
    fontWeight: '900',
    letterSpacing: 0.38,  // 1% of 38px
    color: colors.text,
  },
  mainProgressSection: {
    marginBottom: spacing.xxxl,
  },
  progressPercentage: {
    fontSize: 48,  // Smaller than before (was 56)
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -1,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,  // Space between label and progress bar
  },
  progressBarContainer: {
    position: 'relative',
  },
  progressBarBackground: {
    height: progressBar.main,
    backgroundColor: colors.progressBackground,
    borderRadius: borders.radius,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borders.radius,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  practiceContainer: {
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    overflow: 'hidden',
  },
  unitCard: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitContent: {
    flex: 1,
  },
  unitTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: 6,
  },
  unitSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  unitProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unitProgressBar: {
    flex: 1,
    height: progressBar.unit,
    backgroundColor: colors.progressBackground,
    borderRadius: borders.radius,
    overflow: 'hidden',
  },
  unitProgressFill: {
    height: '100%',
    borderRadius: borders.radius,
  },
  unitProgressText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  practiceItem: {
    backgroundColor: colors.backgroundElevated,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  practiceItemWithBorder: {
    borderBottomWidth: borders.width,
    borderBottomColor: colors.border,
  },
  practiceItemText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginRight: 16,
  },
  arrowIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: colors.text,
  },
});