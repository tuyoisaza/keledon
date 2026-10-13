import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getBrands, getCompanies, getTeams, type Brand, type Company, type Team } from '@/lib/crud-api';
import { readStoredContext, saveStoredContext, storageKeyFor } from './brain-storage';
import type { User } from '@/context/AuthContext';

export function useBrainContextData(user: User | null) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = storageKeyFor(user?.id);
    async function loadContext() {
      setLoading(true);
      try {
        const [companyList, brandList, teamList] = await Promise.all([
          getCompanies(), getBrands(), getTeams(),
        ]);
        setCompanies(companyList);
        setBrands(brandList);
        setTeams(teamList);
        const stored = readStoredContext(key);
        const firstCompanyWithBrands = companyList.find((company) =>
          brandList.some((brand) => brand.companyId === company.id),
        );
        const fallbackCompanyId = firstCompanyWithBrands?.id || companyList[0]?.id || '';
        const initialCompanyId = stored.companyId || user?.companyId || fallbackCompanyId;
        const companyBrands = brandList.filter((brand) => brand.companyId === initialCompanyId);
        const initialBrandId = stored.brandId && companyBrands.some((brand) => brand.id === stored.brandId)
          ? stored.brandId : companyBrands[0]?.id || '';
        const brandTeams = teamList.filter((team) => team.brandId === initialBrandId);
        const initialTeamId = stored.teamId && brandTeams.some((team) => team.id === stored.teamId)
          ? stored.teamId : brandTeams[0]?.id || '';
        setSelectedCompanyId(initialCompanyId);
        setSelectedBrandId(initialBrandId);
        setSelectedTeamId(initialTeamId);
      } catch (error) {
        console.error('Failed to load Brain context', error);
        toast.error('Failed to load company, brand, and team data');
      } finally {
        setLoading(false);
      }
    }
    if (user) void loadContext();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedCompanyId) return;
    saveStoredContext(storageKeyFor(user.id), {
      companyId: selectedCompanyId,
      brandId: selectedBrandId,
      teamId: selectedTeamId,
    });
  }, [selectedCompanyId, selectedBrandId, selectedTeamId, user]);

  const selectedCompany = useMemo(() => companies.find((company) => company.id === selectedCompanyId), [companies, selectedCompanyId]);
  const selectedBrand = useMemo(() => brands.find((brand) => brand.id === selectedBrandId), [brands, selectedBrandId]);
  const selectedTeam = useMemo(() => teams.find((team) => team.id === selectedTeamId), [teams, selectedTeamId]);
  const brandsForCompany = useMemo(() => brands.filter((brand) => brand.companyId === selectedCompanyId), [brands, selectedCompanyId]);
  const teamsForBrand = useMemo(() => teams.filter((team) => team.brandId === selectedBrandId), [teams, selectedBrandId]);
  const configReady = Boolean(selectedCompany && selectedBrand && selectedTeam);

  useEffect(() => {
    if (!selectedCompanyId || !brandsForCompany.length) return;
    if (!brandsForCompany.some((brand) => brand.id === selectedBrandId)) {
      const next = brandsForCompany[0];
      setSelectedBrandId(next.id);
      setSelectedTeamId(teams.find((team) => team.brandId === next.id)?.id || '');
    }
  }, [brandsForCompany, selectedBrandId, selectedCompanyId, teams]);

  useEffect(() => {
    if (!selectedBrandId || !teamsForBrand.length) return;
    if (!teamsForBrand.some((team) => team.id === selectedTeamId)) setSelectedTeamId(teamsForBrand[0].id);
  }, [selectedBrandId, selectedTeamId, teamsForBrand]);

  function handleCompanyChange(companyId: string) {
    setSelectedCompanyId(companyId);
    const next = brands.find((brand) => brand.companyId === companyId);
    setSelectedBrandId(next?.id || '');
    setSelectedTeamId(teams.find((team) => team.brandId === next?.id)?.id || '');
  }

  function handleBrandChange(brandId: string) {
    setSelectedBrandId(brandId);
    setSelectedTeamId(teams.find((team) => team.brandId === brandId)?.id || '');
  }

  return {
    companies, brands, teams, selectedCompanyId, setSelectedCompanyId,
    selectedBrandId, setSelectedBrandId, selectedTeamId, setSelectedTeamId,
    selectedCompany, selectedBrand, selectedTeam, brandsForCompany, teamsForBrand,
    configReady, loading, handleCompanyChange, handleBrandChange,
  };
}
