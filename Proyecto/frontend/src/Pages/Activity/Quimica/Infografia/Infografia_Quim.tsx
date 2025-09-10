import ActivityLayoutInfografia from "../../../../Layouts/ActivityLayout/ActivityLayoutInfografia";
import styles from './Infografia_Quim.module.css';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const questions = [
	{
		question: '¿Cuál es el elemento químico con símbolo H?',
		hint: 'Pista: Es el más ligero y abundante en el universo.',
		options: [
			'A. Helio',
			'B. Hidrógeno',
			'C. Hierro'
		]
	},
	{
		question: '¿Qué partícula subatómica tiene carga negativa?',
		hint: 'Pista: Gira alrededor del núcleo.',
		options: [
			'A. Protón',
			'B. Neutrón',
			'C. Electrón'
		]
	},
	{
		question: '¿Cuál es el pH de una solución neutra?',
		hint: 'Pista: Es el valor central de la escala.',
		options: [
			'A. 0',
			'B. 7',
			'C. 14'
		]
	},
	{
		question: '¿Qué científico propuso la tabla periódica moderna?',
		hint: 'Pista: Su apellido empieza con M.',
		options: [
			'A. Mendeleiev',
			'B. Dalton',
			'C. Bohr'
		]
	}
];

const InfografiaQuim = () => {
	const navigate = useNavigate();
	const [page, setPage] = useState(0);
	const [selected, setSelected] = useState<number|null>(null);
	const q = questions[page];
	return (
		<ActivityLayoutInfografia title="Infografía: Química General">
			<div className={styles.flexRow}>
				<div className={styles.panelAzul1}>
					<div className={styles.panelTopControls}>
						<button
							className={styles.backButton}
							onClick={() => navigate('/subjects/quimica')}
							aria-label="Volver a Química"
						>
							<span className={styles.arrow}>&larr;</span>
						</button>
						<div className={styles.zoomControls}>
							<button className={styles.zoomBtn} aria-label="Zoom in">+</button>
							<button className={styles.zoomBtn} aria-label="Zoom out">-</button>
						</div>
					</div>
					<div className={styles.infografiaContainer}>
						{/* Aquí irá la imagen de la infografía */}
						<img
							src=""
							alt="Infografía de Química"
							className={styles.infografiaImg}
						/>
					</div>
				</div>
				   <div className={styles.flexColumnCenter}>
					<div className={styles.activityTitle}>Química General</div>
					<div className={styles.panelAzul2}>
						<div className={styles.question}>{q.question}</div>
						<br />
						<span className={styles.hint}>{q.hint}</span>
						<div className={styles.containeroptions}>
							<button className={styles.option1 + (selected === 0 ? ' ' + styles.selected : '')} onClick={() => setSelected(0)}>
								<span className={styles.optionLetter + ' ' + styles.letterA}>A</span>
								{q.options[0].replace(/^A\.?\s*/, "")}
							</button>
							<button className={styles.option2 + (selected === 1 ? ' ' + styles.selected : '')} onClick={() => setSelected(1)}>
								<span className={styles.optionLetter + ' ' + styles.letterB}>B</span>
								{q.options[1].replace(/^B\.?\s*/, "")}
							</button>
							<button className={styles.option3 + (selected === 2 ? ' ' + styles.selected : '')} onClick={() => setSelected(2)}>
								<span className={styles.optionLetter + ' ' + styles.letterC}>C</span>
								{q.options[2].replace(/^C\.?\s*/, "")}
							</button>
						</div>
						<div className={styles.paginationContainer}>
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
							<button className={styles.finishedBtn}>
								Finalizar
								<span className={styles.coinIcon}>🪙</span>
								<span className={styles.coinValue}>+5</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</ActivityLayoutInfografia>
	);
};

export default InfografiaQuim;
