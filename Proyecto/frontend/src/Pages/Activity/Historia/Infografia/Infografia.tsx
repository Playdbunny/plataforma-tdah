


import ActivityLayout from "../../../../Layouts/ActivityLayout/ActivityLayout";
import styles from './Infografia.module.css';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';



const questions = [
	{
		question: 'En 1914, las principales potencias europeas buscaban un pretexto para... ¿Qué?',
		hint: 'Pista visual: Revisa la parte superior de la infografía.',
		options: [
			'A. Medir sus fuerzas y obtener más territorio.',
			'B. Establecer un nuevo comercio con Asia.',
			'C. Declarar la paz en Europa.'
		]
	},
	{
		question: '¿Cuál fue el detonante inmediato de la Primera Guerra Mundial?',
		hint: 'Pista: Ocurrió en Sarajevo en 1914.',
		options: [
			'A. El asesinato del archiduque Francisco Fernando.',
			'B. La firma del Tratado de Versalles.',
			'C. La invasión de Polonia.'
		]
	},
	{
		question: '¿Qué países formaban parte de la Triple Entente?',
		hint: 'Pista: Incluye a Francia.',
		options: [
			'A. Alemania, Austria-Hungría, Italia.',
			'B. Francia, Reino Unido, Rusia.',
			'C. Turquía, Bulgaria, Serbia.'
		]
	},
	{
		question: '¿Cuál fue una consecuencia importante de la Primera Guerra Mundial?',
		hint: 'Pista: Cambios en el mapa político de Europa.',
		options: [
			'A. La creación de la ONU.',
			'B. La caída de imperios y aparición de nuevos países.',
			'C. El inicio de la Guerra Fría.'
		]
	}
];

const Infografia = () => {
	const navigate = useNavigate();
	const [page, setPage] = useState(0);
	const q = questions[page];
	return (
			<ActivityLayout title="Primera Guerra Mundial">
				<div className={styles.activityTitle}>Primera Guerra Mundial</div>
				<div className={styles.flexRow}>
					<div className={styles.panelAzul1}>
					<div className={styles.panelTopControls}>
						<button
							className={styles.backButton}
							onClick={() => navigate('/subjects/historia')}
							aria-label="Volver a Historia"
						>
							<span className={styles.arrow}>&larr;</span>
						</button>
						<div className={styles.zoomControls}>
							<button className={styles.zoomBtn} aria-label="Zoom in">+</button>
							<button className={styles.zoomBtn} aria-label="Zoom out">-</button>
						</div>
					</div>
					{/* Aquí va la infografía o imagen */}
					<img
						src=""
						alt=""
						className={styles.infografiaImg}
					/>
				</div>
				<div className={styles.panelAzul2}>
					<div className={styles.question}>{q.question}</div>
					<br />
					<b>{q.hint}</b>
					<div className={styles.options1}>
						<button className={styles.option1}>{q.options[0]}</button>
					</div>
					<div className={styles.options2}>
						<button className={styles.option2}>{q.options[1]}</button>
					</div>
					<div className={styles.options3}>
						<button className={styles.option3}>{q.options[2]}</button>
					</div>
					<div className={styles.paginationBar}>
						<button
							className={styles.paginationBtn}
							onClick={() => setPage((p) => Math.max(0, p - 1))}
							disabled={page === 0}
						>Anterior</button>
						<span className={styles.paginationInfo}>Página {page + 1} de {questions.length}</span>
						<button
							className={styles.paginationBtn}
							onClick={() => setPage((p) => Math.min(questions.length - 1, p + 1))}
							disabled={page === questions.length - 1}
						>Siguiente</button>
						<span className={styles.progressIndicator}>
							{questions.map((_, i) => (
								<span
									key={i}
									className={
										styles.progressDot + (i === page ? ' ' + styles.active : '')
									}
								></span>
							))}
						</span>
					</div>
					<button className={styles.finishedBtn}>
						Finished
						<span className={styles.coinIcon}>🪙</span>
						<span className={styles.coinValue}>+5</span>
					</button>
				</div>
			</div>
		</ActivityLayout>
	);
};

export default Infografia;

