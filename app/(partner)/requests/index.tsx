import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MapPin, Clock, Package, TrendingUp, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { socketService } from '../../../src/services/socket.service';
import { apiClient } from '../../../src/services/api.service';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { FadeIn } from '../../../src/components/animations/FadeIn';
import { PressableScale } from '../../../src/components/animations/PressableScale';
import { EmptyState } from '../../../src/components/feedback/EmptyState';
import { Card } from '../../../src/components/ui/Card';
import { colors, spacing } from '../../../src/theme';
import { getApiError, showToast } from '../../../src/utils/toast';

interface DeliveryRequest {
  deliveryId: string;
  trackingId: string;
  pickup:     { address: string };
  drop:       { address: string };
  distance:   number;
  duration:   number;
  category:   string;
  fare:       { total: number };
  pickupDistanceKm: number;
}

const REQUEST_TIMEOUT = 45;

export default function RequestsScreen() {
  const isOnline  = useAppSelector(s => s.partner.isOnline);
  const [request, setRequest]   = useState<DeliveryRequest | null>(null);
  const [timeLeft, setTimeLeft] = useState(REQUEST_TIMEOUT);
  const [accepting, setAccepting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for incoming request
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue:1.04, duration:600, useNativeDriver:true }),
        Animated.timing(pulseAnim, { toValue:1,    duration:600, useNativeDriver:true }),
      ])
    ).start();
  };

  useEffect(() => {
    socketService.on('delivery:request-incoming', (data: unknown) => {
      const req = data as DeliveryRequest;
      setRequest(req);
      setTimeLeft(REQUEST_TIMEOUT);
      startPulse();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    });

    socketService.on('delivery:request-timeout', () => {
      setRequest(null);
      pulseAnim.stopAnimation();
    });

    return () => {
      socketService.off('delivery:request-incoming');
      socketService.off('delivery:request-timeout');
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!request) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setRequest(null);
          pulseAnim.stopAnimation();
          return REQUEST_TIMEOUT;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [request]);

  const handleAccept = async () => {
    if (!request) return;
    setAccepting(true);
    try {
      await apiClient.post(`/partners/deliveries/${request.deliveryId}/accept`);
      socketService.emit('partner:accept-request', { deliveryId: request.deliveryId });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRequest(null);
      showToast('success', 'Delivery accepted', 'Navigate to pickup location.');
    } catch (err: unknown) {
      showToast('error', 'Could not accept', getApiError(err));
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = () => {
    if (!request) return;
    socketService.emit('partner:reject-request', { deliveryId: request.deliveryId });
    setRequest(null);
    pulseAnim.stopAnimation();
  };

  if (!isOnline) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="You're offline"
          message="Go online from the Dashboard to start receiving delivery requests."
        />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.screen}>
        <FadeIn>
          <EmptyState
            title="Waiting for requests"
            message="You'll be notified when a delivery is nearby. Keep the app open."
          />
        </FadeIn>
        <View style={styles.waitingDot}>
          <Animated.View style={[styles.dot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.waitingText}>Listening for deliveries...</Text>
        </View>
      </View>
    );
  }

  const timerPct = (timeLeft / REQUEST_TIMEOUT) * 100;
  const timerColor = timeLeft > 20 ? colors.brand[600] : timeLeft > 10 ? '#d97706' : '#dc2626';

  return (
    <View style={styles.screen}>
      <FadeIn>
        <Text style={styles.screenTitle}>New Request</Text>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Card style={styles.requestCard}>
            {/* Timer bar */}
            <View style={styles.timerBar}>
              <View style={[styles.timerFill, { width:`${timerPct}%`, backgroundColor: timerColor }]} />
            </View>
            <View style={styles.timerRow}>
              <Clock size={13} color={timerColor} />
              <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s remaining</Text>
            </View>

            {/* Tracking ID */}
            <Text style={styles.trackingId}>{request.trackingId}</Text>

            {/* Route */}
            <View style={styles.routeContainer}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: colors.brand[600] }]} />
                <View style={{ flex:1 }}>
                  <Text style={styles.routeLabel}>Pickup</Text>
                  <Text style={styles.routeAddr} numberOfLines={2}>{request.pickup?.address}</Text>
                </View>
                <Text style={styles.distBadge}>{request.pickupDistanceKm?.toFixed(1)} km away</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor:'#dc2626' }]} />
                <View style={{ flex:1 }}>
                  <Text style={styles.routeLabel}>Drop</Text>
                  <Text style={styles.routeAddr} numberOfLines={2}>{request.drop?.address}</Text>
                </View>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MapPin size={14} color={colors.neutral[500]} />
                <Text style={styles.statValue}>{request.distance?.toFixed(1)} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Clock size={14} color={colors.neutral[500]} />
                <Text style={styles.statValue}>{request.duration} min</Text>
                <Text style={styles.statLabel}>Est. time</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Package size={14} color={colors.neutral[500]} />
                <Text style={styles.statValue}>{request.category}</Text>
                <Text style={styles.statLabel}>Category</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <TrendingUp size={14} color={colors.brand[600]} />
                <Text style={[styles.statValue, { color:colors.brand[700] }]}>₹{request.fare?.total}</Text>
                <Text style={styles.statLabel}>Earning</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <PressableScale onPress={handleReject} style={styles.rejectBtn}>
                <X size={22} color="#dc2626" />
                <Text style={styles.rejectLabel}>Reject</Text>
              </PressableScale>

              <PressableScale onPress={handleAccept} style={[styles.acceptBtn, accepting && { opacity:0.7 }]}>
                <Check size={22} color="#fff" />
                <Text style={styles.acceptLabel}>{accepting ? 'Accepting...' : 'Accept'}</Text>
              </PressableScale>
            </View>
          </Card>
        </Animated.View>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex:1, backgroundColor:'#f9fafb', padding:spacing.base, paddingTop:spacing['4xl'] },
  screenTitle:  { fontSize:20, fontWeight:'700', color:colors.neutral[900], marginBottom:16 },
  requestCard:  { overflow:'hidden' },
  timerBar:     { height:4, backgroundColor:colors.neutral[100], borderRadius:2, marginBottom:8, overflow:'hidden' },
  timerFill:    { height:4, borderRadius:2 },
  timerRow:     { flexDirection:'row', alignItems:'center', gap:4, marginBottom:12 },
  timerText:    { fontSize:12, fontWeight:'700' },
  trackingId:   { fontSize:11, fontFamily:'monospace', color:colors.neutral[400], marginBottom:16 },
  routeContainer:{ backgroundColor:colors.neutral[50], borderRadius:12, padding:14, marginBottom:16, gap:4 },
  routeRow:     { flexDirection:'row', alignItems:'flex-start', gap:10 },
  routeDot:     { width:10, height:10, borderRadius:5, marginTop:4 },
  routeLine:    { width:1, height:16, backgroundColor:colors.neutral[200], marginLeft:4.5, marginVertical:2 },
  routeLabel:   { fontSize:11, color:colors.neutral[400], fontWeight:'600', textTransform:'uppercase', letterSpacing:0.5 },
  routeAddr:    { fontSize:13, color:colors.neutral[800], fontWeight:'500', marginTop:2, lineHeight:18 },
  distBadge:    { fontSize:11, color:colors.brand[600], fontWeight:'600', backgroundColor:colors.brand[50], paddingHorizontal:8, paddingVertical:3, borderRadius:8 },
  statsRow:     { flexDirection:'row', borderTopWidth:1, borderTopColor:colors.neutral[100], paddingTop:14, marginBottom:16 },
  statItem:     { flex:1, alignItems:'center', gap:4 },
  statValue:    { fontSize:13, fontWeight:'700', color:colors.neutral[800] },
  statLabel:    { fontSize:10, color:colors.neutral[400], fontWeight:'500' },
  statDivider:  { width:1, backgroundColor:colors.neutral[100] },
  actionRow:    { flexDirection:'row', gap:12 },
  rejectBtn:    { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:14, borderRadius:12, borderWidth:1.5, borderColor:'#fecaca', backgroundColor:'#fff5f5' },
  rejectLabel:  { fontSize:15, fontWeight:'700', color:'#dc2626' },
  acceptBtn:    { flex:2, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:14, borderRadius:12, backgroundColor:colors.brand[600] },
  acceptLabel:  { fontSize:15, fontWeight:'700', color:'#fff' },
  waitingDot:   { alignItems:'center', marginTop:24, gap:10 },
  dot:          { width:14, height:14, borderRadius:7, backgroundColor:colors.brand[500] },
  waitingText:  { fontSize:13, color:colors.neutral[400], fontWeight:'500' },
});
