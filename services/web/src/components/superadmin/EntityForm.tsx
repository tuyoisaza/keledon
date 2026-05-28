import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { type Company, type Brand, type Team } from '@/lib/crud-api';

interface EntityFormProps {
    activeTab: string;
    editingEntity: any | null;
    handleSave: (e: React.FormEvent<HTMLFormElement>) => void;
    saving?: boolean;
    onClose: () => void;
    selectedCountries: string[];
    setSelectedCountries: React.Dispatch<React.SetStateAction<string[]>>;
    availableCountries: { code: string; name: string }[];
    companies: Company[];
    brands: Brand[];
    teams: Team[];
    selectedCompanyId: string;
    setSelectedCompanyId: (id: string) => void;
    selectedCountryCode: string;
    setSelectedCountryCode: (code: string) => void;
    formFields: any[];
    isSuperAdmin: boolean;
}

export const EntityForm: React.FC<EntityFormProps> = ({
    activeTab,
    editingEntity,
    handleSave,
    saving = false,
    onClose,
    selectedCountries,
    setSelectedCountries,
    availableCountries,
    companies,
    brands,
    teams,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCountryCode,
    setSelectedCountryCode,
    formFields,
    isSuperAdmin
}) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    {editingEntity ? 'Edit' : 'Add'} {
                        activeTab === 'companies' ? 'Company' :
                            activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(1, -1)
                    }
                </h3>
                <form onSubmit={handleSave} className="space-y-4">
                    {activeTab === 'companies' ? (
                        <>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Company Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    defaultValue={editingEntity?.name || ''}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Industry</label>
                                <input
                                    type="text"
                                    name="industry"
                                    defaultValue={editingEntity?.industry || ''}
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Operating Countries</label>
                                <div className="mb-2 min-h-[60px] p-3 bg-muted rounded-lg border border-border">
                                    {selectedCountries.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedCountries.map(code => {
                                                const country = availableCountries.find(c => c.code === code);
                                                return (
                                                    <div key={code} className="flex items-center justify-between p-2 rounded bg-background border border-border">
                                                        <span className="text-sm">
                                                            {country ? country.name : code}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCountries(prev => prev.filter(c => c !== code))}
                                                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic text-center py-4">No countries added</p>
                                    )}
                                </div>
                                <select
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val && !selectedCountries.includes(val)) {
                                            setSelectedCountries(prev => [...prev, val]);
                                        }
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">+ Add Country</option>
                                    {availableCountries.map(c => (
                                        <option key={c.code} value={c.code} disabled={selectedCountries.includes(c.code)}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : activeTab === 'brands' ? (
                        <>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Brand Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    defaultValue={editingEntity?.name || ''}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-1">Company</label>
                                    <select
                                        name="company_id"
                                        value={selectedCompanyId}
                                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="">Select Company...</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {!isSuperAdmin && (
                                <input type="hidden" name="company_id" value={selectedCompanyId} />
                            )}
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Color</label>
                                <input
                                    type="color"
                                    name="color"
                                    defaultValue={editingEntity?.color || '#000000'}
                                    className="w-full h-10 p-1 rounded bg-muted border border-border cursor-pointer"
                                />
                            </div>
                        </>
                    ) : activeTab === 'teams' ? (
                        <>
                            {isSuperAdmin && (
                                <>
                                    <div>
                                        <label className="block text-sm text-muted-foreground mb-1">Company</label>
                                        <select
                                            value={selectedCompanyId}
                                            onChange={(e) => {
                                                setSelectedCompanyId(e.target.value);
                                                setSelectedCountryCode('');
                                            }}
                                            required
                                            className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="">Select Company...</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <input type="hidden" name="company_id" value={selectedCompanyId} />
                                </>
                            )}
                            {!isSuperAdmin && (
                                <input type="hidden" name="company_id_hidden" value={selectedCompanyId} />
                            )}
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Country</label>
                                <select
                                    name="country"
                                    value={selectedCountryCode}
                                    onChange={(e) => setSelectedCountryCode(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    disabled={!selectedCompanyId}
                                >
                                    <option value="">Select Country...</option>
                                    {companies.find(c => c.id === selectedCompanyId)?.countries?.map((c: any) => {
                                        const countryCode = typeof c === 'string' ? c : c.country_code;
                                        const fullCountry = availableCountries.find(ac => ac.code === countryCode);
                                        return (
                                            <option key={countryCode} value={countryCode}>
                                                {fullCountry ? fullCountry.name : countryCode}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Brand</label>
                                <select
                                    name="brand_id"
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    defaultValue={editingEntity?.brand_id || ''}
                                    disabled={!selectedCompanyId}
                                >
                                    <option value="">Select Brand...</option>
                                    {brands.filter(b => b.company_id === selectedCompanyId).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Team Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    defaultValue={editingEntity?.name || ''}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </>
                    ) : activeTab === 'users' ? (
                        <>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    defaultValue={editingEntity?.name || ''}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    defaultValue={editingEntity?.email || ''}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-1">Company</label>
                                    <select
                                        name="company_id"
                                        value={selectedCompanyId}
                                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="">Select Company...</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {!isSuperAdmin && (
                                <input type="hidden" name="company_id" value={selectedCompanyId} />
                            )}
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-1">Brand</label>
                                    <select
                                        name="brand_id"
                                        defaultValue={editingEntity?.brand_id || ''}
                                        className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        disabled={!selectedCompanyId}
                                    >
                                        <option value="">Select Brand...</option>
                                        {brands.filter(b => b.company_id === selectedCompanyId).map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Team</label>
                                <select
                                    name="team_id"
                                    defaultValue={editingEntity?.team_id || ''}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    disabled={!selectedCompanyId}
                                >
                                    <option value="">Select Team...</option>
                                    {teams
                                        .filter(t => {
                                            const teamBrand = brands.find(b => b.id === t.brand_id);
                                            return teamBrand && teamBrand.company_id === selectedCompanyId;
                                        })
                                        .map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-1">Role</label>
                                <select
                                    name="role"
                                    defaultValue={editingEntity?.role || 'user'}
                                    required
                                    className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                                </select>
                            </div>
                        </>
                    ) : (
                        formFields.map((field) => (
                            <div key={field.name}>
                                <label className="block text-sm text-muted-foreground mb-1">{field.label}</label>
                                {field.type === 'select' ? (
                                    <select
                                        name={field.name}
                                        defaultValue={editingEntity ? editingEntity[field.name] : ''}
                                        required={field.required}
                                        className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                                    >
                                        <option value="">Select...</option>
                                        {field.options?.map((opt: any) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : field.type === 'color' ? (
                                    <input
                                        type="color"
                                        name={field.name}
                                        defaultValue={editingEntity ? editingEntity[field.name] : '#000000'}
                                        className="w-full h-10 p-1 rounded bg-muted border border-border cursor-pointer"
                                    />
                                ) : field.type === 'textarea' ? (
                                    <textarea
                                        name={field.name}
                                        defaultValue={editingEntity ? editingEntity[field.name] : ''}
                                        required={field.required}
                                        className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                ) : (
                                    <input
                                        type={field.type}
                                        name={field.name}
                                        defaultValue={editingEntity ? editingEntity[field.name] : ''}
                                        required={field.required}
                                        className="w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                )}
                            </div>
                        ))
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
