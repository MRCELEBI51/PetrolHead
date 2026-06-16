import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

export default function TabLayout() {
  const router = useRouter();
  const token = useSelector((state: any) => state.auth.token);
  const currentUser = useSelector((state: any) => state.auth.user);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E53935',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: styles.tabBar,
        headerShown: false, // We will render our own header on each page
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Anasayfa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          title: 'Forum',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="otoai"
        options={{
          title: 'OtoAI',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Etkinlikler',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => {
            if (token && currentUser) {
              return currentUser.profileImage ? (
                <Image
                  source={{ uri: currentUser.profileImage }}
                  style={[
                    styles.tabAvatar,
                    { borderColor: focused ? '#E53935' : '#6B7280' }
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.tabAvatarPlaceholder,
                    { borderColor: focused ? '#E53935' : '#6B7280' }
                  ]}
                >
                  <Ionicons name="person" size={14} color={color} />
                </View>
              );
            }
            return <Ionicons name="person-outline" size={24} color={color} />;
          },
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          href: null, // Hide unused post tab from navigation
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 11,
  },
  tabAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  tabAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
