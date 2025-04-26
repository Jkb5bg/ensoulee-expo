// app/subscription.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
  Image,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Define plan type
interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  color: [string, string]; // Fixed as a tuple with 2 strings
  featured?: boolean;
  features: string[];
  paymentLink: string;
}

// Subscription plan details
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$4.99/month',
    color: ['#7986CB', '#3F51B5'], // This is now a tuple
    features: [
      'Unlimited matches',
      'Basic matchmaking algorithm',
      'Up to 3 profile photos',
      'Standard messaging features',
      'Ad-supported experience'
    ],
    paymentLink: 'https://buy.stripe.com/cN23d290Mgd30NieUU'
  },
  {
    id: 'enhanced',
    name: 'Enhanced',
    price: '$9.99/month',
    color: ['#FF7B6F', '#F44D7B'], // This is now a tuple
    featured: true,
    features: [
      'Advanced AI matchmaking',
      'Priority in match queue',
      'Up to 5 profile photos',
      'Enhanced messaging features',
      'Ad-free experience',
      'See who liked your profile'
    ],
    paymentLink: 'https://buy.stripe.com/3cscNC7WI6Ct0NicMN'
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$14.99/month',
    color: ['#FFD54F', '#FFA000'], // This is now a tuple
    features: [
      'Elite AI matchmaking algorithm',
      'Top of the match queue',
      'Unlimited profile photos',
      'All messaging features',
      'Premium customer support',
      'See who liked your profile',
      'Unlimited profile rewinds'
    ],
    paymentLink: 'https://buy.stripe.com/7sIeVKccY6CtanS5km'
  }
];

const SubscriptionScreen = () => {
  const handleSubscribe = (paymentLink: string) => {
    Linking.openURL(paymentLink);
  };

  const handleBack = () => {
    router.back();
  };

  const checkmark = <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 30 }} />
      </View>
      
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Upgrade your experience with Ensoulee premium features
          </Text>
        </View>
        
        {SUBSCRIPTION_PLANS.map((plan) => (
          <View 
            key={plan.id} 
            style={[
              styles.planCard,
              plan.featured && styles.featuredCard
            ]}
          >
            {plan.featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>MOST POPULAR</Text>
              </View>
            )}
            
            <LinearGradient
              colors={plan.color}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.planHeader}
            >
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
            </LinearGradient>
            
            <View style={styles.planFeatures}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  {checkmark}
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => handleSubscribe(plan.paymentLink)}
            >
              <LinearGradient
                colors={plan.color}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Subscribe</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            * Payments are processed securely through Stripe.
          </Text>
          <Text style={styles.infoText}>
            * Subscriptions renew automatically each month and can be canceled anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#181818',
  },
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    height: 60,
    backgroundColor: 'rgba(31, 34, 35, 1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 5,
  },
  titleContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#bbb',
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#222',
    borderRadius: 16,
    marginBottom: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    position: 'relative',
  },
  featuredCard: {
    borderColor: '#F44D7B',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  featuredBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#F44D7B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomLeftRadius: 8,
    zIndex: 1,
  },
  featuredText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  planHeader: {
    padding: 20,
    alignItems: 'center',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
  },
  planFeatures: {
    padding: 20,
    backgroundColor: '#2a2a2a',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  subscribeButton: {
    margin: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 10,
    padding: 15,
  },
  infoText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
});

export default SubscriptionScreen;