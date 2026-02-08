import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borders } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function AddDeckScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // TODO: Get actual user ID from auth
  const userId = '00000000-0000-0000-0000-000000000001';

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a deck name');
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from('custom_decks')
        .insert({
          user_id: userId,
          name: name.trim(),
          description: description.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Deck created!', [
        { 
          text: 'OK', 
          onPress: () => {
            // Navigate to deck detail to add cards
            router.replace({
              pathname: '/review/deck',
              params: { deckId: data.id }
            });
          }
        }
      ]);
    } catch (err: any) {
      console.error('Error saving deck:', err);
      Alert.alert('Error', 'Failed to create deck: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerCategory}>NEW DECK</Text>
          <Text style={styles.headerTitle}>Create Deck</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Deck Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Travel Phrases, Business Chinese"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What is this deck for?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'CREATING...' : 'CREATE DECK'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: borders.width,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  backButtonText: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '300',
  },
  headerContent: {
    flex: 1,
  },
  headerCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  form: {
    gap: spacing.lg,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: borders.width,
    borderColor: colors.border,
    borderRadius: borders.radius,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: borders.radius,
    marginTop: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: 0.5,
  },
});