import React, { useMemo, useState } from "react";

// --- Hypothèses et constantes de calcul ---
// Densité de l'alcool pur : 0,789 g/mL
const ETHANOL_DENSITY = 0.789; // g/mL
// Coefficient de diffusion (Widmark r)
const R_MALE = 0.68;
const R_FEMALE = 0.55;
// Vitesse moyenne d'élimination (France) ~0,15 g/L/h
const BETA = 0.15; // g/L/h
// Seuil légal de référence
const LEGAL_LIMIT = 0.5; // g/L

// Types
interface Drink {
	id: string;
	label: string;
	volumeMl: number; // mL
	abv: number; // % vol
}

type Sex = "male" | "female";

// Utilitaires
const fmt = (n: number, d = 2) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
const fmtHM = (n: number) => {
	const totalMinutes = Math.round(n * 60); // convertit en minutes
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	return `${h}h ${m.toString().padStart(2, "0")}m`;
};
const uid = () => Math.random().toString(36).slice(2, 9);

export default function AlcoholCalculator() {
	const [sex, setSex] = useState<Sex>("male");
	const [weight, setWeight] = useState<number>(75); // kg
	const [hoursSinceStart, setHoursSinceStart] = useState<number>(0); // h depuis la première boisson
	const [drinks, setDrinks] = useState<Drink[]>([
		{ id: uid(), label: "Bière (50 cL, 5%)", volumeMl: 500, abv: 5 }
	]);

	const r = sex === "male" ? R_MALE : R_FEMALE;

	const gramsPureAlcohol = useMemo(() => {
		// Somme des grammes d'alcool pur: volume(mL) * (%/100) * densité(g/mL)
		return drinks.reduce((sum, d) => sum + d.volumeMl * (d.abv / 100) * ETHANOL_DENSITY, 0);
	}, [drinks]);

	const peakBAC = useMemo(() => {
		// Approximation BAC (g/L) au pic: grammes / (poids* r)
		if (!weight || weight <= 0) return 0;
		return gramsPureAlcohol / (weight * r);
	}, [gramsPureAlcohol, r, weight]);

	const currentBAC = useMemo(() => {
		// Diminution linéaire avec le temps écoulé depuis le début de consommation
		const bac = Math.max(0, peakBAC - BETA * Math.max(0, hoursSinceStart));
		return bac;
	}, [peakBAC, hoursSinceStart]);

	const hoursToLegal = useMemo(() => {
		if (currentBAC <= LEGAL_LIMIT) return 0;
		return (currentBAC - LEGAL_LIMIT) / BETA;
	}, [currentBAC]);

	const hoursToZero = useMemo(() => currentBAC / BETA, [currentBAC]);

	const addDrink = (preset?: Partial<Drink>) => {
		const base: Drink = {
			id: uid(),
			label: preset?.label ?? "Boisson",
			volumeMl: preset?.volumeMl ?? 500,
			abv: preset?.abv ?? 5,
		};
		setDrinks((s) => [...s, base]);
	};

	const updateDrink = (id: string, patch: Partial<Drink>) => {
		setDrinks((s) => s.map((d) => (d.id === id ? { ...d, ...patch } : d)));
	};

	const removeDrink = (id: string) => setDrinks((s) => s.filter((d) => d.id !== id));

	return (
		<div className="mx-auto p-6">
			<header className="px-4 mb-4 flex items-center justify-between">
				<h1 className="text-2xl font-semibold tracking-tight">🍺 Bacchus</h1>
			</header>

			<div className="grid gap-6 md:grid-cols-3">
				<section className="md:col-span-1 rounded-2xl bg-gray-200 p-4 shadow-sm">
					<h2 className="mb-3 text-lg font-medium">Vos paramètres</h2>
					<div className="space-y-4">
						<div>
							<label className="mb-1 block text-sm text-gray-600">Sexe</label>
							<div className="grid grid-cols-2 gap-2">
								<button onClick={() => setSex("male")} className={`rounded-xl px-3 py-2 text-sm ${sex === "male" ? "bg-blue-900 text-white" : "bg-white hover:bg-gray-50"}`}>
									Homme
								</button>
								<button onClick={() => setSex("female")} className={`rounded-xl px-3 py-2 text-sm ${sex === "female" ? "bg-pink-900 text-white" : "bg-white hover:bg-gray-50"}`}>
									Femme
								</button>
							</div>
						</div>

						<div>
							<label className="mb-1 block text-sm text-gray-600">Poids (kg)</label>
							<input type="number" inputMode="decimal" min={30} max={200} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full rounded-xl bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900" />
						</div>

						<div>
							<label className="mb-1 block text-sm text-gray-600">Heures écoulées depuis la 1ʳᵉ boisson</label>
							<input type="number" inputMode="decimal" min={0} step={0.5} value={hoursSinceStart} onChange={(e) => setHoursSinceStart(Number(e.target.value))} className="w-full rounded-xl bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900" />
						</div>
					</div>

					<div className="mt-6">
						<h3 className="mb-2 text-sm font-medium text-gray-700">Préréglages rapides</h3>
						<div className="flex flex-wrap gap-2">
							<PresetButton onClick={() => addDrink({ label: "Bière 25 cL (5%)", volumeMl: 250, abv: 5 })}>🍺 Bière 25 cL</PresetButton>
							<PresetButton onClick={() => addDrink({ label: "Bière 33 cL (5%)", volumeMl: 330, abv: 5 })}>🍺 Bière 33 cL</PresetButton>
							<PresetButton onClick={() => addDrink({ label: "Bière 50 cL (5%)", volumeMl: 500, abv: 5 })}>🍺 Bière 50 cL</PresetButton>
							<PresetButton onClick={() => addDrink({ label: "Vin 12 cL (12%)", volumeMl: 120, abv: 12 })}>🍷 Verre de vin</PresetButton>
							<PresetButton onClick={() => addDrink({ label: "Shot 4 cL (40%)", volumeMl: 40, abv: 40 })}>🥃 Shot 4 cL</PresetButton>
							<PresetButton onClick={() => addDrink({ label: "Cocktail 20 cL (10%)", volumeMl: 200, abv: 10 })}>🍹 Cocktail</PresetButton>
						</div>
					</div>
				</section>

				<section className="md:col-span-2 rounded-2xl bg-gray-200 p-4 shadow-sm">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-medium">Vos consommations</h2>
						<button onClick={() => addDrink()} className="rounded-xl border border-gray-900 bg-gray-900 px-3 py-2 text-sm text-white hover:opacity-90">
							Ajouter une boisson
						</button>
					</div>

					<div className="space-y-3">
						{drinks.map((d) => (
							<div key={d.id} className="grid grid-cols-10 items-end gap-3 rounded-2xl bg-white p-3">
								<div className="col-span-12 sm:col-span-4">
									<label className="mb-1 block text-xs text-gray-500">Nom</label>
									<input type="text" value={d.label} onChange={(e) => updateDrink(d.id, { label: e.target.value })} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
								</div>
								<div className="col-span-6 sm:col-span-2">
									<label className="mb-1 block text-xs text-gray-500">Volume (cL)</label>
									<input
										type="number"
										inputMode="decimal"
										min={1}
										value={d.volumeMl / 10}
										onChange={(e) => updateDrink(d.id, { volumeMl: Number(e.target.value) * 10 })}
										className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
									/>
								</div>
								<div className="col-span-6 sm:col-span-2">
									<label className="mb-1 block text-xs text-gray-500">Alcool (% vol)</label>
									<input
										type="number"
										inputMode="decimal"
										min={0}
										max={100}
										value={d.abv}
										onChange={(e) => updateDrink(d.id, { abv: Number(e.target.value) })}
										className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
									/>
								</div>
								<div className="col-span-12 sm:col-span-2 sm:ml-auto flex sm:block items-center justify-between">
									<div className="mb-1 text-xs text-gray-500">~ {fmt(d.volumeMl * (d.abv / 100) * ETHANOL_DENSITY, 1)} g d'alcool</div>
									<button onClick={() => removeDrink(d.id)} aria-label="Supprimer la boisson" className="rounded-xl bg-red-500 border px-3 py-2 text-sm text-white hover:bg-red-600">
										Supprimer
									</button>
								</div>
							</div>
						))}

						{drinks.length === 0 && <p className="text-sm text-gray-500">Aucune boisson. Ajoutez une consommation ou utilisez un préréglage.</p>}
					</div>
				</section>
			</div>

			<section className="mt-6 grid gap-6 md:grid-cols-3">
				<Card title="Alcool pur total">
					<div className="text-2xl font-semibold">{fmt(gramsPureAlcohol, 1)} g</div>
					<p className="mt-1 text-sm text-gray-500">Quantité d'alcool pur ingéré.</p>
				</Card>

				<Card title="TA estimé (actuel)">
					<div className={`text-2xl font-semibold ${currentBAC >= LEGAL_LIMIT ? "text-red-600" : "text-emerald-700"}`}>{fmt(currentBAC, 2)} g/L</div>
					<p className="mt-1 text-sm text-gray-500">
						D'après{" "}
						<a className="underline hover:no-underline" href="https://fr.wikipedia.org/wiki/Alcool%C3%A9mie" target="_blank">
							Widmark
						</a>
						, après {fmtHM(hoursSinceStart)}.
					</p>
				</Card>

				<Card title="Temps pour ≤ 0,5 g/L">
					<div className="text-2xl font-semibold">{fmtHM(Math.max(0, hoursToLegal))}</div>
					<p className="mt-1 text-sm text-gray-500">À vitesse d'élimination moyenne {BETA} g/L/h.</p>
				</Card>
			</section>

			<section className="mt-6 grid gap-6 md:grid-cols-2">
				<Card title="Temps pour revenir à 0">
					<div className="text-xl font-semibold">{fmtHM(Math.max(0, hoursToZero))}</div>
					<p className="mt-1 text-sm text-gray-500">Estimation. Hydratation et repas peuvent influer.</p>
				</Card>
				<Card title="Récapitulatif">
					<ul className="text-sm text-gray-700">
						<li>
							Sexe : <b>{sex === "male" ? "Homme" : "Femme"}</b> (r = {r})
						</li>
						<li>
							Pic théorique : <b>{fmt(peakBAC, 2)} g/L</b>
						</li>
						<li>
							Seuil légal (en France) : <b>{LEGAL_LIMIT} g/L</b>
						</li>
					</ul>
				</Card>
			</section>

			<footer className="px-4 mt-4 text-xs text-red-500">
				<p>
					Outil informatif qui ne remplace pas un éthylotest. Les calculs sont des estimations et peuvent varier selon de nombreux facteurs (absorption, métabolisme, médicaments).<br /> <strong>Ne conduisez pas si vous avez bu.</strong>
				</p>
			</footer>
		</div>
	);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-2xl bg-gray-200 p-4 shadow-sm">
			<h3 className="text-base font-medium">{title}</h3>
			<div className="mt-2">{children}</div>
		</div>
	);
}

function PresetButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
	return (
		<button onClick={onClick} className="rounded-xl px-3 py-1.5 text-xs bg-white hover:bg-gray-50">
			{children}
		</button>
	);
}
