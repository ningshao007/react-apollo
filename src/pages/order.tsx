import { gql, useMutation, useQuery, useSubscription } from '@apollo/client';
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FULL_ORDER_FRAGMENT } from '../fragments';
import { useMe } from '../hooks/useMe';
import { editOrder, editOrderVariables } from '../__generated__/editOrder';
import { getOrder, getOrderVariables } from '../__generated__/getOrder';
import { OrderStatus, UserRole } from '../__generated__/globalTypes';
import { orderUpdates, orderUpdatesVariables } from '../__generated__/orderUpdates';

const GET_ORDER = gql`
	query getOrder($input: GetOrderInput!) {
		getOrder(input: $input) {
			ok
			error
			order {
				...FullOrderParts
			}
		}
	}
	${FULL_ORDER_FRAGMENT}
`;

const ORDER_SUBSCRIPTION = gql`
	subscription orderUpdates($input: OrderUpdatesInput!) {
		orderUpdates(input: $input) {
			...FullOrderParts
		}
	}
	${FULL_ORDER_FRAGMENT}
`;

const EDIT_ORDER = gql`
	mutation editOrder($input: EditOrderInput!) {
		editOrder(input: $input) {
			ok
			error
		}
	}
`;

interface IParams {
	id: string;
}

export const Order = () => {
	const params = useParams<IParams>();
	const { data: userData } = useMe();
	const [editOrderMutation] = useMutation<editOrder, editOrderVariables>(EDIT_ORDER);
	const { data, subscribeToMore } = useQuery<getOrder, getOrderVariables>(GET_ORDER, {
		variables: {
			input: {
				id: +params.id,
			},
		},
	});
	useEffect(() => {
		if (data?.getOrder.ok) {
			subscribeToMore({
				document: ORDER_SUBSCRIPTION,
				variables: {
					input: {
						id: +params.id,
					},
				},
				updateQuery: (prev, { subscriptionData: { data } }: { subscriptionData: { data: orderUpdates } }) => {
					if (!data) return prev;
					return {
						getOrder: {
							...prev.getOrder,
							order: {
								...data.orderUpdates,
							},
						},
					};
				},
			});
		}
	}, [data]);
	const onButtonClick = (newStatus: OrderStatus) => {
		editOrderMutation({
			variables: {
				input: {
					id: +params.id,
					status: newStatus,
				},
			},
		});
	};
	return (
		<div className='mt-32 container flex justify-center'>
			<div className='border border-gray-800 w-full max-w-screen-sm flex flex-col justify-center'>
				<h4 className='bg-gray-800 w-full py-5 text-white text-center text-xl'>Order #{params.id}</h4>
				<h5 className='p-5 pt-10 text-3xl text-center '>${data?.getOrder.order?.total}</h5>
				<div className='p-5 text-xl grid gap-6'>
					<div className='border-t pt-5 border-gray-700'>
						Prepared By: <span className='font-medium'>{data?.getOrder.order?.restaurant?.name}</span>
					</div>
					<div className='border-t pt-5 border-gray-700 '>
						Deliver To: <span className='font-medium'>{data?.getOrder.order?.customer?.email}</span>
					</div>
					<div className='border-t border-b py-5 border-gray-700'>
						Driver: <span className='font-medium'>{data?.getOrder.order?.driver?.email || 'Not yet.'}</span>
					</div>
					{userData?.me.role === 'CLIENT' && <span className=' text-center mt-5 mb-3  text-2xl text-lime-600'>Status: {data?.getOrder.order?.status}</span>}
					{userData?.me.role === UserRole.OWNER && (
						<>
							{data?.getOrder.order?.status === OrderStatus.PENDING && (
								<button onClick={() => onButtonClick(OrderStatus.COOKING)} className='btn'>
									Accept Order
								</button>
							)}
							{data?.getOrder.order?.status === OrderStatus.COOKING && (
								<button onClick={() => onButtonClick(OrderStatus.COOKED)} className='btn'>
									Order COOKED
								</button>
							)}
							{data?.getOrder.order?.status !== OrderStatus.COOKING && data?.getOrder.order?.status !== OrderStatus.PENDING && (
								<span className=' text-center mt-5 mb-3  text-2xl text-lime-600'>Status: {data?.getOrder.order?.status}</span>
							)}
						</>
					)}
					{userData?.me.role === UserRole.DELIVERY && (
						<>
							{data?.getOrder.order?.status === OrderStatus.COOKED && (
								<button onClick={() => onButtonClick(OrderStatus.PICKED_UP)} className='btn'>
									Picked Up
								</button>
							)}
							{data?.getOrder.order?.status === OrderStatus.PICKED_UP && (
								<button onClick={() => onButtonClick(OrderStatus.DELIVERED)} className='btn'>
									Order DELIVERED
								</button>
							)}
						</>
					)}
					{data?.getOrder.order?.status === OrderStatus.DELIVERED && <span className=' text-center mt-5 mb-3  text-2xl text-lime-600'>Thank you for using Nuber Eats</span>}
				</div>
			</div>
		</div>
	);
};
