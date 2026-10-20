import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuiaColors } from '@/constants/theme';

const CATEGORIES = [
  { id: '1', label: 'Construção', icon: 'hammer' as const },
  { id: '2', label: 'Alimentação', icon: 'silverware-fork-knife' as const },
  { id: '3', label: 'Oficina', icon: 'car-wrench' as const },
  { id: '4', label: 'Farmácia', icon: 'pill' as const },
  { id: '5', label: 'Beleza', icon: 'content-cut' as const },
  { id: '6', label: 'Serviços', icon: 'tools' as const },
  { id: '7', label: 'Outros', icon: 'dots-horizontal-circle' as const },
];

const BANNERS = [
  { id: '1', title: 'Promoções da Semana', subtitle: 'Ofertas perto de você', emoji: '🔥', color: '#7C5C00' },
  { id: '2', title: 'Anuncie Aqui', subtitle: 'Alcance milhares de clientes', emoji: '📢', color: '#3D3A8C' },
  { id: '3', title: 'Festival Gastronômico', subtitle: '10 a 18 de maio', emoji: '🍔', color: '#8C2F3D' },
];

const COUPONS = [
  { id: '1', title: '20% OFF em Pizzas', business: 'Restaurante Sabor & Arte', color: '#5C4033' },
  { id: '2', title: 'Troca de óleo grátis', business: 'Oficina do Zé', color: '#2F4858' },
  { id: '3', title: '30% OFF no corte', business: 'Barbearia Central', color: '#4A3F6B' },
];

const JOBS = [
  { id: '1', role: 'Atendente de Loja', company: 'Mercado Bom Preço' },
  { id: '2', role: 'Mecânico Automotivo', company: 'Auto Center Silva' },
  { id: '3', role: 'Vendedor(a)', company: 'Movelaria Popular' },
  { id: '4', role: 'Recepcionista', company: 'Clínica Vida Plena' },
];

export default function HomeScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Header />
          <SearchBar />
          <Categories />
          <Banners />
          <PharmacyOnDuty />
          <FeaturedCompany />
          <Coupons />
          <Jobs />
          <AnnounceCta />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.locationButton} activeOpacity={0.7}>
        <Ionicons name="location-sharp" size={18} color={GuiaColors.primary} />
        <Text style={styles.locationText}>Sua cidade</Text>
        <Ionicons name="chevron-down" size={14} color={GuiaColors.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        Busque no maior guia de empresas da cidade.
      </Text>
    </View>
  );
}

function SearchBar() {
  return (
    <View style={styles.searchBar}>
      <TextInput
        style={styles.searchInput}
        placeholder="Empresa, produto ou serviço"
        placeholderTextColor={GuiaColors.textSecondary}
      />
      <TouchableOpacity style={styles.micButton} activeOpacity={0.7}>
        <Ionicons name="mic-outline" size={20} color={GuiaColors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.searchButton} activeOpacity={0.8}>
        <Ionicons name="search" size={18} color={GuiaColors.background} />
      </TouchableOpacity>
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={GuiaColors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Categories() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoriesContent}>
      {CATEGORIES.map((category) => (
        <TouchableOpacity key={category.id} style={styles.categoryItem} activeOpacity={0.7}>
          <View style={styles.categoryIconBox}>
            <MaterialCommunityIcons name={category.icon} size={26} color={GuiaColors.primary} />
          </View>
          <Text style={styles.categoryLabel}>{category.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function Banners() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContent}>
      {BANNERS.map((banner) => (
        <TouchableOpacity key={banner.id} style={[styles.bannerCard, { backgroundColor: banner.color }]} activeOpacity={0.85}>
          <Text style={styles.bannerEmoji}>{banner.emoji}</Text>
          <Text style={styles.bannerTitle}>{banner.title}</Text>
          <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function PharmacyOnDuty() {
  return (
    <View style={styles.pharmacyCard}>
      <View style={styles.pharmacyHeader}>
        <MaterialCommunityIcons name="pill" size={20} color={GuiaColors.primary} />
        <Text style={styles.pharmacyTitle}>Farmácia de Plantão Hoje</Text>
      </View>
      <Text style={styles.pharmacyName}>Drogaria Popular</Text>
      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Aberto até 23h</Text>
      </View>
      <View style={styles.pharmacyActions}>
        <TouchableOpacity style={styles.pillDark} activeOpacity={0.7}>
          <Ionicons name="map-outline" size={16} color={GuiaColors.primary} />
          <Text style={styles.pillDarkText}>Como chegar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pillYellow} activeOpacity={0.8}>
          <Ionicons name="call" size={16} color={GuiaColors.background} />
          <Text style={styles.pillYellowText}>Ligar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FeaturedCompany() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Empresas em Destaque" icon="star" />
      <View style={styles.companyCard}>
        <View style={styles.companyCover}>
          <MaterialCommunityIcons name="office-building" size={48} color="rgba(255,255,255,0.25)" />
          <View style={styles.highlightTag}>
            <Text style={styles.highlightTagText}>Destaque</Text>
          </View>
        </View>
        <View style={styles.companyBody}>
          <Text style={styles.companyName}>Construtora Alicerce</Text>
          <Text style={styles.companyCategory}>Construção e Reformas</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={GuiaColors.textSecondary} />
            <Text style={styles.companyAddress}>Av. Brasil, 1520 — Centro</Text>
          </View>
          <View style={styles.companyActions}>
            <TouchableOpacity style={styles.actionPill} activeOpacity={0.7}>
              <Ionicons name="call-outline" size={16} color={GuiaColors.primary} />
              <Text style={styles.actionPillText}>Ligar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPill} activeOpacity={0.7}>
              <Ionicons name="location-outline" size={16} color={GuiaColors.primary} />
              <Text style={styles.actionPillText}>Endereço</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.whatsappPill} activeOpacity={0.8}>
              <MaterialCommunityIcons name="whatsapp" size={16} color={GuiaColors.background} />
              <Text style={styles.whatsappPillText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function Coupons() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Cupons e Descontos" icon="pricetag" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}>
        {COUPONS.map((coupon) => (
          <TouchableOpacity key={coupon.id} style={[styles.couponCard, { backgroundColor: coupon.color }]} activeOpacity={0.85}>
            <View style={styles.couponTag}>
              <Text style={styles.couponTagText}>Cupom Exclusivo</Text>
            </View>
            <Text style={styles.couponTitle}>{coupon.title}</Text>
            <Text style={styles.couponBusiness}>{coupon.business}</Text>
            <View style={styles.couponFooter}>
              <Ionicons name="copy-outline" size={14} color={GuiaColors.primary} />
              <Text style={styles.couponFooterText}>Copiar cupom</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function Jobs() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Oportunidades na Cidade" icon="briefcase" />
      <View style={styles.jobsList}>
        {JOBS.map((job) => (
          <View key={job.id} style={styles.jobItem}>
            <View style={styles.jobInfo}>
              <Text style={styles.jobRole}>{job.role}</Text>
              <Text style={styles.jobCompany}>{job.company}</Text>
            </View>
            <TouchableOpacity style={styles.jobButton} activeOpacity={0.8}>
              <Text style={styles.jobButtonText}>Ver Vaga</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

function AnnounceCta() {
  return (
    <TouchableOpacity style={styles.ctaContainer} activeOpacity={0.8}>
      <Text style={styles.ctaText}>
        Quer sua empresa aqui? <Text style={styles.ctaHighlight}>Clique aqui e anuncie no Guia!</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GuiaColors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  locationText: {
    color: GuiaColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: GuiaColors.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: GuiaColors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    paddingLeft: 16,
    paddingRight: 6,
    height: 52,
  },
  searchInput: {
    flex: 1,
    color: GuiaColors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  micButton: {
    padding: 8,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GuiaColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoriesContent: {
    paddingHorizontal: 16,
    gap: 14,
    marginBottom: 24,
  },
  categoryItem: {
    alignItems: 'center',
    width: 68,
    gap: 8,
  },
  categoryIconBox: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: GuiaColors.surface,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    color: GuiaColors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: GuiaColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },

  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  bannerCard: {
    width: 260,
    height: 130,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'flex-end',
    gap: 4,
  },
  bannerEmoji: {
    fontSize: 28,
    position: 'absolute',
    top: 12,
    right: 14,
  },
  bannerTitle: {
    color: GuiaColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },

  pharmacyCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: GuiaColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    padding: 16,
    gap: 6,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pharmacyTitle: {
    color: GuiaColors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  pharmacyName: {
    color: GuiaColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GuiaColors.success,
  },
  statusText: {
    color: GuiaColors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  pharmacyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pillDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GuiaColors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GuiaColors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillDarkText: {
    color: GuiaColors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  pillYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GuiaColors.primary,
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  pillYellowText: {
    color: GuiaColors.background,
    fontSize: 13,
    fontWeight: '700',
  },

  companyCard: {
    marginHorizontal: 16,
    backgroundColor: GuiaColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    overflow: 'hidden',
  },
  companyCover: {
    height: 120,
    backgroundColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: GuiaColors.primary,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  highlightTagText: {
    color: GuiaColors.background,
    fontSize: 12,
    fontWeight: '800',
  },
  companyBody: {
    padding: 16,
    gap: 6,
  },
  companyName: {
    color: GuiaColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  companyCategory: {
    color: GuiaColors.textSecondary,
    fontSize: 13,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  companyAddress: {
    color: GuiaColors.textSecondary,
    fontSize: 13,
  },
  companyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GuiaColors.surfaceAlt,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionPillText: {
    color: GuiaColors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  whatsappPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GuiaColors.whatsapp,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  whatsappPillText: {
    color: GuiaColors.background,
    fontSize: 13,
    fontWeight: '700',
  },

  couponCard: {
    width: 200,
    minHeight: 150,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    gap: 8,
  },
  couponTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  couponTagText: {
    color: GuiaColors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  couponTitle: {
    color: GuiaColors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  couponBusiness: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  couponFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  couponFooterText: {
    color: GuiaColors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  jobsList: {
    marginHorizontal: 16,
    backgroundColor: GuiaColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    overflow: 'hidden',
  },
  jobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GuiaColors.border,
    gap: 12,
  },
  jobInfo: {
    flex: 1,
    gap: 2,
  },
  jobRole: {
    color: GuiaColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  jobCompany: {
    color: GuiaColors.textSecondary,
    fontSize: 13,
  },
  jobButton: {
    backgroundColor: GuiaColors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  jobButtonText: {
    color: GuiaColors.background,
    fontSize: 13,
    fontWeight: '700',
  },

  ctaContainer: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    color: GuiaColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaHighlight: {
    color: GuiaColors.primary,
    fontWeight: '700',
  },
});
